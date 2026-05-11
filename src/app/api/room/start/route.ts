// src/app/api/room/start/route.ts
import { NextResponse } from "next/server";
import { applyStartGame, enforceRateLimit, getClientIpFromHeaders, getRoomTokenFromHeaders, logAuditEvent, normalizeRoomCode, sanitizeStateForPlayer } from "@/lib/server-room";

export async function POST(request: Request) {
  let roomCode = ""; let playerId: string | null = null;
  const ip = getClientIpFromHeaders(request.headers);
  const roomToken = getRoomTokenFromHeaders(request.headers); // ✅
  try {
    const body = (await request.json()) as { roomCode?: string; playerId?: string };
    roomCode = normalizeRoomCode(body.roomCode ?? "");
    playerId = body.playerId?.trim() ?? null;
    if (!roomCode || !playerId || !roomToken) return NextResponse.json({ error: "Missing inputs." }, { status: 400 });
    await enforceRateLimit({ roomCode, actorKey: playerId, action: "start", limit: 5, windowSeconds: 60 });
    const state = await applyStartGame(roomCode, playerId, roomToken); // ✅
    await logAuditEvent({ roomCode, playerId, action: "start", status: "success", ip });
    return NextResponse.json({ state: sanitizeStateForPlayer(state, playerId) });
  } catch (error) {
    if (roomCode) await logAuditEvent({ roomCode, playerId, action: "start", status: "denied", reason: error instanceof Error ? error.message : "Failed.", ip });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Start failed." }, { status: 400 });
  }
}

// ─────────────────────────────────────────────────
// src/app/api/room/reveal/route.ts
// ─────────────────────────────────────────────────
// import { NextResponse } from "next/server";
// import { applyReveal, ... getRoomTokenFromHeaders } from "@/lib/server-room";
//
// export async function POST(request: Request) {
//   const roomToken = getRoomTokenFromHeaders(request.headers); // ✅
//   const body = await request.json();
//   const state = await applyReveal(roomCode, playerId, cardId, roomToken); // ✅
//   ...
// }
//
// Aynı pattern tüm diğer route'larda da geçerli:
//   applyEndTurn(roomCode, playerId, roomToken)
//   applyClue(roomCode, playerId, clue, number, roomToken)