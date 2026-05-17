import { NextResponse } from "next/server";
import {
  applyDismissReview,
  enforceRateLimit,
  getClientIpFromHeaders,
  getRoomTokenFromHeaders,
  logAuditEvent,
  normalizeRoomCode,
  sanitizeStateForPlayer
} from "@/lib/server-room";

export async function POST(request: Request) {
  let roomCode = "";
  const ip = getClientIpFromHeaders(request.headers);
  const roomToken = getRoomTokenFromHeaders(request.headers);

  try {
    const body = (await request.json()) as { roomCode?: string; playerId?: string };
    roomCode = normalizeRoomCode(body.roomCode ?? "");
    const playerId = body.playerId?.trim() ?? null;

    if (!roomCode || !roomToken) {
      return NextResponse.json({ error: "Missing room code or room token." }, { status: 400 });
    }

    await enforceRateLimit({
      roomCode,
      actorKey: playerId ?? ip,
      action: "dismiss-review",
      limit: 60,
      windowSeconds: 60
    });

    const state = await applyDismissReview(roomCode, roomToken);
    await logAuditEvent({ roomCode, playerId, action: "dismiss-review", status: "success", ip });

    return NextResponse.json({ state: sanitizeStateForPlayer(state, playerId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dismiss failed.";
    if (roomCode) {
      await logAuditEvent({ roomCode, playerId: null, action: "dismiss-review", status: "denied", reason: message, ip });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
