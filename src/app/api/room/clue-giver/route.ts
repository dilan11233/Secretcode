import { NextResponse } from "next/server";
import {
  applyRoleSelection,
  enforceRateLimit,
  fetchRoomRaw,
  getClientIpFromHeaders,
  getRoomTokenFromHeaders,
  logAuditEvent,
  normalizeRoomCode,
  sanitizeStateForPlayer
} from "@/lib/server-room";

export async function POST(request: Request) {
  let roomCode = "";
  let playerId: string | null = null;
  const ip = getClientIpFromHeaders(request.headers);
  const roomToken = getRoomTokenFromHeaders(request.headers);

  try {
    const body = (await request.json()) as { roomCode?: string; playerId?: string };
    roomCode = normalizeRoomCode(body.roomCode ?? "");
    playerId = body.playerId?.trim() ?? null;

    if (!roomCode || !playerId || !roomToken) {
      return NextResponse.json({ error: "Missing inputs." }, { status: 400 });
    }

    await enforceRateLimit({ roomCode, actorKey: playerId, action: "clue-giver", limit: 20, windowSeconds: 60 });

    const raw = await fetchRoomRaw(roomCode);
    if (!raw || raw.roomToken !== roomToken) {
      throw new Error("Room not found or invalid token.");
    }
    const player = raw.state.players.find((p) => p.id === playerId);
    if (!player || !player.team) {
      throw new Error("Choose a team first.");
    }

    const state = await applyRoleSelection(roomCode, playerId, !player.isClueGiver, roomToken);
    await logAuditEvent({ roomCode, playerId, action: "clue-giver", status: "success", ip });

    return NextResponse.json({ state: sanitizeStateForPlayer(state, playerId) });
  } catch (error) {
    if (roomCode) {
      await logAuditEvent({
        roomCode,
        playerId,
        action: "clue-giver",
        status: "denied",
        reason: error instanceof Error ? error.message : "Role update failed.",
        ip
      });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Role update failed." },
      { status: 400 }
    );
  }
}
