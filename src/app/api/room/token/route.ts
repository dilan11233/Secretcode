import { NextResponse } from "next/server";
import { fetchRoomRaw, normalizeRoomCode } from "@/lib/server-room";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomCode = normalizeRoomCode(url.searchParams.get("roomCode") ?? "");
  if (!roomCode) {
    return NextResponse.json({ error: "Missing room code." }, { status: 400 });
  }

  const raw = await fetchRoomRaw(roomCode);
  if (!raw) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  return NextResponse.json({ roomToken: raw.roomToken });
}
