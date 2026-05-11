import { NextResponse } from "next/server";
import {
  applyClueGiverToggle,
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
    await enforceRateLimit({ roomCode, actorKey: playerId ?? ip, action: "clue-giver", limit: 20, windowSeconds: 60 });
    const state = await applyClueGiverToggle(roomCode, playerId);
    await logAuditEvent({ roomCode, playerId, action: "clue-giver", status: "success", ip });
    return NextResponse.json({ state: sanitizeStateForPlayer(state, body.playerId ?? null) });
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Role update failed." }, { status: 400 });
  }
}
