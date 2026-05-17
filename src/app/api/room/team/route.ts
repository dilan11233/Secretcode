// src/app/api/room/team/route.ts
import { NextResponse } from "next/server";
import {
  applyTeamSelection,
  enforceRateLimit,
  getClientIpFromHeaders,
  getRoomTokenFromHeaders,
  logAuditEvent,
  normalizeRoomCode,
  sanitizeStateForPlayer
} from "@/lib/server-room";
import type { Team } from "@/lib/types";

export async function POST(request: Request) {
  let roomCode = "";
  let playerId: string | null = null;
  const ip = getClientIpFromHeaders(request.headers);
  const roomToken = getRoomTokenFromHeaders(request.headers); // ✅

  try {
    const body = (await request.json()) as { roomCode?: string; playerId?: string; team?: Team };
    roomCode = normalizeRoomCode(body.roomCode ?? "");
    playerId = body.playerId?.trim() ?? null;
    const team = body.team;

    if (!roomCode || !playerId || !team || !roomToken) {
      return NextResponse.json({ error: "Missing inputs." }, { status: 400 });
    }

    await enforceRateLimit({ roomCode, actorKey: playerId, action: "team", limit: 20, windowSeconds: 60 });
    const state = await applyTeamSelection(roomCode, playerId, team, roomToken); // ✅
    await logAuditEvent({ roomCode, playerId, action: "team", status: "success", ip });

    return NextResponse.json({ state: sanitizeStateForPlayer(state, playerId) });
  } catch (error) {
    if (roomCode) await logAuditEvent({ roomCode, playerId, action: "team", status: "denied", reason: error instanceof Error ? error.message : "Failed.", ip });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Team selection failed." }, { status: 400 });
  }
}