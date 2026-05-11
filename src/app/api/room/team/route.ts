import { NextResponse } from "next/server";
import {
  applyTeamSelection,
  enforceRateLimit,
  getClientIpFromHeaders,
  logAuditEvent,
  normalizeRoomCode,
  sanitizeStateForPlayer
} from "@/lib/server-room";
import type { Team } from "@/lib/types";

export async function POST(request: Request) {
  let roomCode = "";
  let playerId: string | null = null;
  const ip = getClientIpFromHeaders(request.headers);
  try {
    const body = (await request.json()) as { roomCode?: string; playerId?: string; team?: Team };
    roomCode = normalizeRoomCode(body.roomCode ?? "");
    playerId = body.playerId?.trim() ?? null;
    if (!roomCode || !playerId || !body.team) {
      return NextResponse.json({ error: "Missing inputs." }, { status: 400 });
    }
    await enforceRateLimit({ roomCode, actorKey: playerId ?? ip, action: "team", limit: 20, windowSeconds: 60 });
    const state = await applyTeamSelection(roomCode, playerId, body.team);
    await logAuditEvent({ roomCode, playerId, action: "team", status: "success", reason: `Team ${body.team}`, ip });
    return NextResponse.json({ state: sanitizeStateForPlayer(state, body.playerId ?? null) });
  } catch (error) {
    if (roomCode) {
      await logAuditEvent({
        roomCode,
        playerId,
        action: "team",
        status: "denied",
        reason: error instanceof Error ? error.message : "Team update failed.",
        ip
      });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Team update failed." }, { status: 400 });
  }
}
