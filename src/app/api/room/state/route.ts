import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  getClientIpFromHeaders,
  getRoomState,
  getRoomTokenFromHeaders,
  normalizeRoomCode
} from "@/lib/server-room";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomCode = normalizeRoomCode(url.searchParams.get("roomCode") ?? "");
  const playerId = url.searchParams.get("playerId");
  const roomToken = getRoomTokenFromHeaders(request.headers);
  const ip = getClientIpFromHeaders(request.headers);

  if (!roomCode || !roomToken) {
    return NextResponse.json({ error: "Missing room code or room token." }, { status: 400 });
  }

  try {
    await enforceRateLimit({
      roomCode,
      actorKey: playerId?.trim() || ip,
      action: "state",
      limit: 120,
      windowSeconds: 60
    });
    const state = await getRoomState(roomCode, roomToken, playerId);
    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load room state." },
      { status: 400 }
    );
  }
}
