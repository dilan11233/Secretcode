import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  getClientIpFromHeaders,
  getRoomTokenFromHeaders,
  joinRoom,
  logAuditEvent,
  normalizeRoomCode,
  sanitizeStateForPlayer
} from "@/lib/server-room";

export async function POST(request: Request) {
  let roomCode = "";
  let playerId: string | undefined = undefined;
  const ip = getClientIpFromHeaders(request.headers);
  // ✅ FIX: token header'dan alınıyor
  const roomToken = getRoomTokenFromHeaders(request.headers);

  try {
    const body = (await request.json()) as {
      roomCode?: string;
      nickname?: string;
      playerId?: string;
      hostHint?: boolean;
      hostRole?: "manager" | "employee";
    };

    roomCode = normalizeRoomCode(body.roomCode ?? "");
    const nickname = body.nickname?.trim() ?? "";
    playerId = body.playerId?.trim() || undefined;

    if (!roomCode || !nickname || !roomToken) {
      return NextResponse.json({ error: "Missing room code, nickname, or room token." }, { status: 400 });
    }

    await enforceRateLimit({
      roomCode,
      actorKey: playerId ?? ip,
      action: "join",
      limit: 20,
      windowSeconds: 60
    });

    const result = await joinRoom({
      roomCode,
      nickname,
      playerId,
      hostHint: body.hostHint,
      hostRole: body.hostRole,
      roomToken // ✅ FIX: token joinRoom'a geçiyor
    });

    await logAuditEvent({ roomCode, playerId: result.playerId, action: "join", status: "success", ip });

    return NextResponse.json({
      playerId: result.playerId,
      state: sanitizeStateForPlayer(result.state, result.playerId)
    });
  } catch (error) {
    if (roomCode) {
      await logAuditEvent({
        roomCode,
        playerId: playerId ?? null,
        action: "join",
        status: "denied",
        reason: error instanceof Error ? error.message : "Join failed.",
        ip
      });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Join failed." },
      { status: 400 }
    );
  }
}