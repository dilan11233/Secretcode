import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  fetchRoomRaw,
  getClientIpFromHeaders,
  normalizeRoomCode,
  sanitizeStateForPlayer
} from "@/lib/server-room";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomCode = normalizeRoomCode(url.searchParams.get("roomCode") ?? "");
  const playerId = url.searchParams.get("playerId");
  const ip = getClientIpFromHeaders(request.headers);
  if (!roomCode) {
    return NextResponse.json({ error: "Missing room code." }, { status: 400 });
  }
  await enforceRateLimit({
    roomCode,
    actorKey: playerId?.trim() || ip,
    action: "state",
    limit: 120,
    windowSeconds: 60
  });
  const raw = await fetchRoomRaw(roomCode);
  if (!raw) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  return NextResponse.json({ state: sanitizeStateForPlayer(raw.state, playerId) });
}
