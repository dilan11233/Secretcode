import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { createInitialGameState, endTurn, revealCard, startGame } from "@/lib/game-engine";
import { isRealSupabaseValue } from "@/lib/env";
import { validateLobbyForStart } from "@/lib/lobby-rules";
import type { ClueEntry, GameState, Player, Team } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type HostRole = "manager" | "employee";
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

function serverClient() {
  if (!isRealSupabaseValue(supabaseUrl) || !isRealSupabaseValue(serviceRoleKey)) {
    throw new Error("Server misconfigured: missing Supabase environment variables.");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

function assertSupabaseOk(error: { message: string } | null, fallback: string) {
  if (error) {
    throw new Error(error.message || fallback);
  }
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
  const { error } = await supabase.from("room_action_audit").insert({
    room_code: input.roomCode,
    player_id: input.playerId,
    action: input.action,
    status: input.status,
    reason: input.reason ?? null,
    actor_ip: input.ip ?? null
  });
  if (error) {
    console.error("Failed to write audit event:", error.message);
  }
}

export async function enforceRateLimit(input: RateLimitInput) {
  const supabase = serverClient();
  const key = `${input.roomCode}:${input.actorKey}:${input.action}`;
  const now = new Date();
  const threshold = new Date(now.getTime() - input.windowSeconds * 1000);

  const { data: existing, error: lookupError } = await supabase
    .from("room_rate_limits")
    .select("id,window_start,action_count")
    .eq("scope_key", key)
    .maybeSingle();
  assertSupabaseOk(lookupError, "Failed to read rate limit.");

  if (!existing) {
    const { error } = await supabase.from("room_rate_limits").insert({
      scope_key: key,
      room_code: input.roomCode,
      action: input.action,
      window_start: now.toISOString(),
      action_count: 1
    });
    assertSupabaseOk(error, "Failed to create rate limit.");
    return;
  }

  const windowStart = new Date(existing.window_start as string);
  if (windowStart < threshold) {
    const { error } = await supabase
      .from("room_rate_limits")
      .update({ window_start: now.toISOString(), action_count: 1, updated_at: now.toISOString() })
      .eq("id", existing.id);
    assertSupabaseOk(error, "Failed to reset rate limit.");
    return;
  }

  const nextCount = Number(existing.action_count) + 1;
  if (nextCount > input.limit) {
    throw new Error("Rate limit exceeded. Please slow down.");
  }

  const { error } = await supabase
    .from("room_rate_limits")
    .update({ action_count: nextCount, updated_at: now.toISOString() })
    .eq("id", existing.id);
  assertSupabaseOk(error, "Failed to update rate limit.");
}

export async function fetchRoomRaw(roomCode: string): Promise<{ state: GameState; roomToken: string } | null> {
  const supabase = serverClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("state, room_token")
    .eq("room_code", roomCode)
    .maybeSingle();
  assertSupabaseOk(error, "Failed to fetch room.");
  if (!data) return null;
  return { state: data.state as GameState, roomToken: data.room_token as string };
}

async function loadRoom(roomCode: string, roomToken: string) {
  const raw = await fetchRoomRaw(roomCode);
  if (!raw) throw new Error("Room not found.");
  if (raw.roomToken !== roomToken) throw new Error("Invalid room token.");
  return raw;
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
  const { data: prev, error: lookupError } = await supabase
    .from("room_events")
    .select("version")
    .eq("room_code", roomCode)
    .maybeSingle();
  assertSupabaseOk(lookupError, "Failed to read room event.");
  const version = Number(prev?.version ?? 0) + 1;
  const { error } = await supabase.from("room_events").upsert({ room_code: roomCode, version }, { onConflict: "room_code" });
  assertSupabaseOk(error, "Failed to publish room event.");
}

export async function persistRoom(roomCode: string, state: GameState, roomToken: string) {
  const supabase = serverClient();
  const { error: roomError } = await supabase.from("rooms").upsert(
    {
      room_code: roomCode,
      room_token: roomToken,
      host_player_id: state.hostPlayerId,
      state,
      updated_at: new Date().toISOString()
    },
    { onConflict: "room_code" }
  );
  assertSupabaseOk(roomError, "Failed to persist room.");
  for (const player of state.players) {
    const { error } = await supabase.from("room_players").upsert(
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
    assertSupabaseOk(error, "Failed to persist room player.");
  }
  await bumpRoomEvent(roomCode);
}

export function ensureHostState(state: GameState): GameState {
  const hostExists = state.hostPlayerId && state.players.some((p) => p.id === state.hostPlayerId);
  const hostPlayerId = hostExists ? state.hostPlayerId : state.players[0]?.id ?? null;
  const players = state.players.map((p) => ({ ...p, isHost: !!hostPlayerId && p.id === hostPlayerId }));
  return {
    ...state,
    hostPlayerId,
    players,
    activeClue: state.activeClue ?? null,
    guessesRemaining: state.guessesRemaining ?? 0
  };
}

export async function getRoomState(roomCode: string, roomToken: string, playerId: string | null) {
  const { state } = await loadRoom(roomCode, roomToken);
  return sanitizeStateForPlayer(ensureHostState(state), playerId);
}

export async function joinRoom(input: {
  roomCode: string;
  nickname: string;
  playerId?: string;
  hostHint?: boolean;
  hostTeam?: Team;
  hostRole?: HostRole;
  roomToken: string;
}): Promise<{ state: GameState; playerId: string }> {
  const roomCode = normalizeRoomCode(input.roomCode);
  if (!input.roomToken) throw new Error("Room token is required.");

  const raw = await fetchRoomRaw(roomCode);
  let state: GameState;
  let roomToken: string;

  if (!raw) {
    state = createInitialGameState(roomCode);
    roomToken = input.roomToken;
  } else {
    if (raw.roomToken !== input.roomToken) throw new Error("Invalid room token.");
    state = raw.state;
    roomToken = raw.roomToken;
  }

  const id = input.playerId?.trim() || nanoid(8);
  const existing = state.players.find((p) => p.id === id) ?? null;
  const isNewHost = !existing && state.players.length === 0 && !!input.hostHint;
  const startingTeam = input.hostTeam === "green" ? "green" : "blue";
  const wantsClueGiver = input.hostRole !== "employee";

  const player: Player = existing ?? {
    id,
    nickname: input.nickname.trim().slice(0, 24) || "Guest",
    team: isNewHost ? startingTeam : null,
    isClueGiver: isNewHost && wantsClueGiver,
    isHost: isNewHost
  };

  const updatedPlayer: Player = {
    ...player,
    nickname: input.nickname.trim().slice(0, 24) || player.nickname,
    team: existing?.team ?? player.team,
    isClueGiver: existing?.isClueGiver ?? player.isClueGiver
  };

  const players = [...state.players.filter((p) => p.id !== id), updatedPlayer];
  const next = ensureHostState({ ...state, players });
  await persistRoom(roomCode, next, roomToken);
  return { state: next, playerId: id };
}

export async function applyTeamSelection(roomCode: string, playerId: string, team: Team, roomToken: string) {
  const { state } = await loadRoom(roomCode, roomToken);
  if (state.phase !== "lobby") throw new Error("Team selection is only allowed in lobby.");
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found.");

  const next = ensureHostState({
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, team } : p))
  });
  await persistRoom(roomCode, next, roomToken);
  return next;
}

export async function applyRoleSelection(roomCode: string, playerId: string, isClueGiver: boolean, roomToken: string) {
  const { state } = await loadRoom(roomCode, roomToken);
  if (state.phase !== "lobby") throw new Error("Role selection is only allowed in lobby.");
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found.");
  if (isClueGiver && !player.team) throw new Error("Choose a team before becoming Clue Giver.");

  if (isClueGiver && player.team) {
    const taken = state.players.some((p) => p.id !== playerId && p.team === player.team && p.isClueGiver);
    if (taken) throw new Error("This team already has a Clue Giver.");
  }

  const next = ensureHostState({
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, isClueGiver } : p))
  });
  await persistRoom(roomCode, next, roomToken);
  return next;
}

/** Legacy toggle endpoint — prefer applyRoleSelection with explicit isClueGiver. */
export async function applyClueGiverToggle(roomCode: string, playerId: string, roomToken: string) {
  const { state } = await loadRoom(roomCode, roomToken);
  if (state.phase !== "lobby") throw new Error("Role changes are only allowed in lobby.");
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.team) throw new Error("Choose a team first.");
  if (!player.isClueGiver) {
    const taken = state.players.some((p) => p.team === player.team && p.isClueGiver && p.id !== player.id);
    if (taken) throw new Error("This team already has a Clue Giver.");
  }
  return applyRoleSelection(roomCode, playerId, !player.isClueGiver, roomToken);
}

export async function applyStartGame(roomCode: string, playerId: string, roomToken: string) {
  const { state } = await loadRoom(roomCode, roomToken);
  const fixed = ensureHostState(state);
  if (fixed.hostPlayerId !== playerId) throw new Error("Only the host can start the game.");
  validateLobbyForStart(fixed);
  const next = startGame(fixed);
  await persistRoom(roomCode, next, roomToken);
  return next;
}

export async function applyReveal(roomCode: string, playerId: string, cardId: string, roomToken: string) {
  const { state } = await loadRoom(roomCode, roomToken);
  if (state.phase !== "playing") throw new Error("Game is not in progress.");
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.team) throw new Error("Player not on a team.");
  if (player.isClueGiver) throw new Error("Clue givers cannot guess.");
  if (state.turn !== player.team) throw new Error("Only the active team can guess.");
  const fixed = ensureHostState(state);
  if (!fixed.activeClue || fixed.activeClue.team !== player.team || fixed.guessesRemaining <= 0) {
    throw new Error("Wait for your Clue Giver to send a clue before guessing.");
  }
  const next = revealCard(fixed, cardId);
  await persistRoom(roomCode, next, roomToken);
  return next;
}

export async function applyEndTurn(roomCode: string, playerId: string, roomToken: string) {
  const { state } = await loadRoom(roomCode, roomToken);
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.team) throw new Error("Player not on a team.");
  if (player.isClueGiver) throw new Error("Clue givers cannot end the turn.");
  if (state.turn !== player.team) throw new Error("Only the active team can end the turn.");
  const fixed = ensureHostState(state);
  if (!fixed.activeClue) throw new Error("There is no active clue to end.");
  const next = endTurn(fixed);
  await persistRoom(roomCode, next, roomToken);
  return next;
}

export async function applyClue(
  roomCode: string,
  playerId: string,
  clue: string,
  number: number,
  roomToken: string
) {
  const { state } = await loadRoom(roomCode, roomToken);
  const player = state.players.find((p) => p.id === playerId);
  if (state.phase !== "playing") throw new Error("Game is not in progress.");
  if (!player || !player.team) throw new Error("Player not on a team.");
  if (!player.isClueGiver) throw new Error("Only clue givers can submit clues.");
  if (state.turn !== player.team) throw new Error("Not your team's turn.");
  const fixed = ensureHostState(state);
  if (fixed.activeClue) throw new Error("A clue is already active. End the turn before sending another clue.");
  const cleanClue = clue.trim().toLowerCase();
  if (!cleanClue) throw new Error("Clue is required.");
  if (state.cards.some((c) => c.term.toLowerCase() === cleanClue)) {
    throw new Error("Clue cannot match a board term.");
  }
  const entry: ClueEntry = {
    team: player.team,
    clue: clue.trim(),
    number: Number.isFinite(number) ? Math.max(1, Math.min(9, Math.floor(number))) : 1,
    by: player.nickname,
    createdAt: new Date().toISOString()
  };
  const next = {
    ...fixed,
    activeClue: entry,
    guessesRemaining: entry.number,
    clueHistory: [entry, ...fixed.clueHistory].slice(0, 20)
  };
  await persistRoom(roomCode, next, roomToken);
  return next;
}

export async function applyDismissReview(roomCode: string, roomToken: string) {
  const { state } = await loadRoom(roomCode, roomToken);
  if (!state.review) return state;
  const next = { ...state, review: null };
  await persistRoom(roomCode, next, roomToken);
  return next;
}
