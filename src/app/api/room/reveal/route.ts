import { NextResponse } from "next/server";
import {
  applyReveal,
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
    const body = (await request.json()) as { roomCode?: string; playerId?: string; cardId?: string };
    roomCode = normalizeRoomCode(body.roomCode ?? "");
    playerId = body.playerId?.trim() ?? null;
    if (!roomCode || !playerId || !body.cardId || !roomToken) {
      return NextResponse.json({ error: "Missing inputs." }, { status: 400 });
    }
    await enforceRateLimit({ roomCode, actorKey: playerId ?? ip, action: "reveal", limit: 40, windowSeconds: 60 });
    const state = await applyReveal(roomCode, playerId, body.cardId, roomToken);
    await logAuditEvent({
      roomCode,
      playerId,
      action: "reveal",
      status: "success",
      reason: `card:${body.cardId}`,
      ip
    });
    return NextResponse.json({ state: sanitizeStateForPlayer(state, body.playerId ?? null) });
  } catch (error) {
    if (roomCode) {
      await logAuditEvent({
        roomCode,
        playerId,
        action: "reveal",
        status: "denied",
        reason: error instanceof Error ? error.message : "Reveal failed.",
        ip
      });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reveal failed." }, { status: 400 });
  }
}
