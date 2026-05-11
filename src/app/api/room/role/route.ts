import { NextResponse } from "next/server";
import {
  applyRoleSelection,
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
    const body = (await request.json()) as { roomCode?: string; playerId?: string; isManager?: boolean };
    roomCode = normalizeRoomCode(body.roomCode ?? "");
    playerId = body.playerId?.trim() ?? null;
    const isManager = body.isManager ?? false;
    if (!roomCode || !playerId) {
      return NextResponse.json({ error: "Missing inputs." }, { status: 400 });
    }
    await enforceRateLimit({ roomCode, actorKey: playerId ?? ip, action: "role", limit: 20, windowSeconds: 60 });
    const state = await applyRoleSelection(roomCode, playerId, isManager);
    await logAuditEvent({ roomCode, playerId, action: "role", status: "success", ip });
    return NextResponse.json({ state: sanitizeStateForPlayer(state, body.playerId ?? null) });
  } catch (error) {
    if (roomCode) {
      await logAuditEvent({
        roomCode,
        playerId,
        action: "role",
        status: "denied",
        reason: error instanceof Error ? error.message : "Role selection failed.",
        ip
      });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Role selection failed." }, { status: 400 });
  }
}
