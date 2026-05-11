import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { createInitialGameState, endTurn, revealCard, startGame } from "@/lib/game-engine";
import type { ClueEntry, GameState, Player, Team } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type HostRole = "manager" | "employee";

function serverClient() {
  return createClient(supabaseUrl, serviceRoleKey);
}

function chooseBalancedTeam(players: Player[]): Team {
  const blueCount = players.filter((p) => p.team === "blue").length;
  const greenCount = players.filter((p) => p.team === "green").length;
  if (blueCount < greenCount) return "blue";
  if (greenCount < blueCount) return "green";
  return Math.random() < 0.5 ? "blue" : "green";
}

type AuditStatus = "success" | "denied" | "error";

interface AuditEventInput {
  roomCode: string;
  playerId: string | null;
  action: string;
  status: AuditStatus;
  reason?: string;
  ip?: string;
}

interface RateLimitInput {
  roomCode: string;
  actorKey: string;
  action: string;
  limit: number;
  windowSeconds: number;
}

export function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

export function getRoomTokenFromHeaders(headers: Headers): string {
  return headers.get("x-room-token")?.trim() ?? "";
}

export function getClientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() ?? "unknown";
}

export async function logAuditEvent(input: AuditEventInput) {
  const supabase = serverClient();
  await supabase.from("room_action_audit").insert({
    room_code: input.roomCode,
    player_id: input.playerId,
    action: input.action,
    status: input.status,
    reason: input.reason ?? null,
    actor_ip: input.ip ?? null
  });
}

export async function enforceRateLimit(input: RateLimitInput) {
  const supabase = serverClient();
  const key = `${input.roomCode}:${input.actorKey}:${input.action}`;
  const now = new Date();
  const threshold = new Date(now.getTime() - input.windowSeconds * 1000);

  const { data: existing } = await supabase
    .from("room_rate_limits")
    .select("id,window_start,action_count")
    .eq("scope_key", key)
    .maybeSingle();

  if (!existing) {
    await supabase.from("room_rate_limits").insert({
      scope_key: key,
      room_code: input.roomCode,
      action: input.action,
      window_start: now.toISOString(),
      action_count: 1
    });
    return;
  }

  const windowStart = new Date(existing.window_start as string);
  if (windowStart < threshold) {
    await supabase
      .from("room_rate_limits")
      .update({ window_start: now.toISOString(), action_count: 1, updated_at: now.toISOString() })
      .eq("id", existing.id);
    return;
  }

  const nextCount = Number(existing.action_count) + 1;
  if (nextCount > input.limit) {
    throw new Error("Rate limit exceeded. Please slow down.");
  }

  await supabase
    .from("room_rate_limits")
    .update({ action_count: nextCount, updated_at: now.toISOString() })
    .eq("id", existing.id);
}

export async function fetchRoomRaw(roomCode: string): Promise<GameState | null> {
  const supabase = serverClient();
  const { data } = await supabase.from("rooms").select("state").eq("room_code", roomCode).maybeSingle();
  return (data?.state as GameState | undefined) ?? null;
}

export function sanitizeStateForPlayer(state: GameState, playerId: string | null): GameState {
  const me = state.players.find((p) => p.id === playerId) ?? null;
  const canSeeRoles = !!me?.isClueGiver;
  const cards = state.cards.map((card) => {
    if (canSeeRoles || card.revealed) return card;
    return { ...card, role: "N" as const };
  });
  return { ...state, cards };
}

async function bumpRoomEvent(roomCode: string) {
  const supabase = serverClient();
  const { data: prev } = await supabase
    .from("room_events")
    .select("version")
    .eq("room_code", roomCode)
    .maybeSingle();
  const version = Number(prev?.version ?? 0) + 1;
  await supabase.from("room_events").upsert({ room_code: roomCode, version }, { onConflict: "room_code" });
}

export async function persistRoom(roomCode: string, state: GameState) {
  const supabase = serverClient();
  await supabase.from("rooms").upsert(
    {
      room_code: roomCode,
      host_player_id: state.hostPlayerId,
      state,
      updated_at: new Date().toISOString()
    },
    { onConflict: "room_code" }
  );
  for (const player of state.players) {
    await supabase.from("room_players").upsert(
      {
        room_code: roomCode,
        player_id: player.id,
        nickname: player.nickname,
        team: player.team,
        is_clue_giver: player.isClueGiver,
        is_host: player.isHost
      },
      { onConflict: "room_code,player_id" }
    );
  }
  await bumpRoomEvent(roomCode);
}

export function ensureHostState(state: GameState): GameState {
  const hostExists = state.hostPlayerId && state.players.some((p) => p.id === state.hostPlayerId);
  const hostPlayerId = hostExists ? state.hostPlayerId : state.players[0]?.id ?? null;
  const players = state.players.map((p) => ({ ...p, isHost: !!hostPlayerId && p.id === hostPlayerId }));
  return { ...state, hostPlayerId, players };
}

function canStartWithPlayers(players: Player[]) {
  const teamBlue = players.filter((p) => p.team === "blue");
  const teamGreen = players.filter((p) => p.team === "green");
  const clueBlue = teamBlue.filter((p) => p.isClueGiver).length;
  const clueGreen = teamGreen.filter((p) => p.isClueGiver).length;
  return teamBlue.length > 0 && teamGreen.length > 0 && clueBlue === 1 && clueGreen === 1;
}

export async function joinRoom(input: {
  roomCode: string;
  nickname: string;
  playerId?: string;
  hostHint?: boolean;
  hostRole?: HostRole;
}): Promise<{ state: GameState; playerId: string }> {
  const roomCode = normalizeRoomCode(input.roomCode);
  let state = await fetchRoomRaw(roomCode);

  if (!state) {
    state = createInitialGameState(roomCode);
  }

  const id = input.playerId?.trim() || nanoid(8);
  const existing = state.players.find((p) => p.id === id) ?? null;
  const player: Player = existing ?? {
    id,
    nickname: input.nickname.trim().slice(0, 24) || "Guest",
    team: null,
    isClueGiver: false,
    isHost: state.players.length === 0 && !!input.hostHint
  };

  const assignedTeam = player.team ?? chooseBalancedTeam(state.players);
  // Roles are now explicitly chosen via UI, not auto-assigned
  const isClueGiver = existing?.isClueGiver ?? false;

  const updatedPlayer = {
    ...player,
    nickname: input.nickname.trim().slice(0, 24) || player.nickname,
    team: assignedTeam,
    isClueGiver
  };

  const players = [...state.players.filter((p) => p.id !== id), updatedPlayer];
  const next = ensureHostState({ ...state, players });
  await persistRoom(roomCode, next);
  return { state: next, playerId: id };
}

export async function applyTeamSelection(roomCode: string, playerId: string, team: Team) {
  const state = await fetchRoomRaw(roomCode);
  if (!state) throw new Error("Room not found.");
  if (state.phase !== "lobby") throw new Error("Team selection is only allowed in lobby.");
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found.");
  const next = ensureHostState({
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, team } : p))
  });
  await persistRoom(roomCode, next);
  return next;
}

export async function applyClueGiverToggle(roomCode: string, playerId: string) {
  const state = await fetchRoomRaw(roomCode);
  if (!state) throw new Error("Room not found.");
  if (state.phase !== "lobby") throw new Error("Role changes are only allowed in lobby.");
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.team) throw new Error("Choose a team first.");
  const occupied = state.players.some((p) => p.team === player.team && p.isClueGiver && p.id !== player.id);
  if (occupied && !player.isClueGiver) throw new Error("This team already has a clue giver.");
  const next = ensureHostState({
    ...state,
    players: state.players.map((p) => (p.id === player.id ? { ...p, isClueGiver: !p.isClueGiver } : p))
  });
  await persistRoom(roomCode, next);
  return next;
}

export async function applyRoleSelection(roomCode: string, playerId: string, isManager: boolean) {
  const state = await fetchRoomRaw(roomCode);
  if (!state) throw new Error("Room not found.");
  if (state.phase !== "lobby") throw new Error("Role selection is only allowed in lobby.");
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found.");
  const next = ensureHostState({
    ...state,
    players: state.players.map((p) => (p.id === player.id ? { ...p, isClueGiver: isManager } : p))
  });
  await persistRoom(roomCode, next);
  return next;
}


export async function applyStartGame(roomCode: string, playerId: string) {
  const state = await fetchRoomRaw(roomCode);
  if (!state) throw new Error("Room not found.");
  const fixed = ensureHostState(state);
  if (fixed.hostPlayerId !== playerId) throw new Error("Only host can start the game.");
  const next = startGame(fixed);
  await persistRoom(roomCode, next);
  return next;
}

export async function applyReveal(roomCode: string, playerId: string, cardId: string) {
  const state = await fetchRoomRaw(roomCode);
  if (!state) throw new Error("Room not found.");
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.team) throw new Error("Player not in team.");
  if (player.isClueGiver) throw new Error("Clue givers cannot guess.");
  if (state.turn !== player.team) throw new Error("Only current team can guess.");
  const next = revealCard(state, cardId);
  await persistRoom(roomCode, next);
  return next;
}

export async function applyEndTurn(roomCode: string, playerId: string) {
  const state = await fetchRoomRaw(roomCode);
  if (!state) throw new Error("Room not found.");
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.team) throw new Error("Player not in team.");
  if (player.isClueGiver) throw new Error("Clue givers cannot end turn.");
  if (state.turn !== player.team) throw new Error("Only current team can end turn.");
  const next = endTurn(state);
  await persistRoom(roomCode, next);
  return next;
}

export async function applyClue(
  roomCode: string,
  playerId: string,
  clue: string,
  number: number
) {
  const state = await fetchRoomRaw(roomCode);
  if (!state) throw new Error("Room not found.");
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.team) throw new Error("Player not in team.");
  if (!player.isClueGiver) throw new Error("Only clue givers can submit clues.");
  if (state.turn !== player.team) throw new Error("Not your team's turn.");
  const cleanClue = clue.trim().toLowerCase();
  if (!cleanClue) throw new Error("Clue is required.");
  if (state.cards.some((c) => c.term.toLowerCase() === cleanClue)) {
    throw new Error("Clue cannot match a board term.");
  }
  const entry: ClueEntry = {
    team: player.team,
    clue: clue.trim(),
    number: Math.max(1, Math.min(9, Math.floor(number))),
    by: player.nickname,
    createdAt: new Date().toISOString()
  };
  const next = {
    ...state,
    clueHistory: [entry, ...state.clueHistory].slice(0, 20)
  };
  await persistRoom(roomCode, next);
  return next;
}
