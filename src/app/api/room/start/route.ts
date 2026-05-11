import { NextResponse } from "next/server";
import {
  applyStartGame,
  enforceRateLimit,
  getClientIpFromHeaders,
  logAuditEvent,
  normalizeRoomCode,
  sanitizeStateForPlayer
} from "@/lib/server-room";

export async function POST(request: Request) {
  let roomCode = "";
  let playerId: string | null = null;
  const ip = getClientIpFromHeaders(request.headers);
  try {
    const body = (await request.json()) as { roomCode?: string; playerId?: string };
    roomCode = normalizeRoomCode(body.roomCode ?? "");
    playerId = body.playerId?.trim() ?? null;
    if (!roomCode || !playerId) {
      return NextResponse.json({ error: "Missing inputs." }, { status: 400 });
    }
    await enforceRateLimit({ roomCode, actorKey: playerId ?? ip, action: "start", limit: 6, windowSeconds: 60 });
    const state = await applyStartGame(roomCode, playerId);
    await logAuditEvent({ roomCode, playerId, action: "start", status: "success", ip });
    return NextResponse.json({ state: sanitizeStateForPlayer(state, body.playerId ?? null) });
  } catch (error) {
    if (roomCode) {
      await logAuditEvent({
        roomCode,
        playerId,
        action: "start",
        status: "denied",
        reason: error instanceof Error ? error.message : "Start failed.",
        ip
      });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Start failed." }, { status: 400 });
  }
}
