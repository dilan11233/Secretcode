import { NextResponse } from "next/server";
import {
  applyClue,
  enforceRateLimit,
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
    const body = (await request.json()) as {
      roomCode?: string;
      playerId?: string;
      clue?: string;
      number?: number;
    };
    roomCode = normalizeRoomCode(body.roomCode ?? "");
    playerId = body.playerId?.trim() ?? null;
    if (!roomCode || !playerId || !body.clue?.trim() || body.number == null || !roomToken) {
      return NextResponse.json({ error: "Missing inputs." }, { status: 400 });
    }
    await enforceRateLimit({ roomCode, actorKey: playerId ?? ip, action: "clue", limit: 15, windowSeconds: 60 });
    const state = await applyClue(roomCode, playerId, body.clue, body.number, roomToken);
    await logAuditEvent({
      roomCode,
      playerId,
      action: "clue",
      status: "success",
      reason: `clue:${body.clue}`,
      ip
    });
    return NextResponse.json({ state: sanitizeStateForPlayer(state, body.playerId ?? null) });
  } catch (error) {
    if (roomCode) {
      await logAuditEvent({
        roomCode,
        playerId,
        action: "clue",
        status: "denied",
        reason: error instanceof Error ? error.message : "Clue failed.",
        ip
      });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Clue failed." }, { status: 400 });
  }
}
