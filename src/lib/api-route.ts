import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  getClientIpFromHeaders,
  getRoomTokenFromHeaders,
  logAuditEvent,
  normalizeRoomCode,
  queueAuditEvent,
  sanitizeStateForPlayer
} from "@/lib/server-room";
import type { GameState } from "@/lib/types";

interface RoomActionOptions<TBody> {
  action: string;
  rateLimit: { limit: number; windowSeconds: number };
  parse: (body: TBody) => { roomCode: string; playerId: string };
  run: (ctx: { roomCode: string; playerId: string; roomToken: string }) => Promise<GameState>;
}

export async function handleRoomAction<TBody extends { roomCode?: string; playerId?: string }>(
  request: Request,
  options: RoomActionOptions<TBody>
): Promise<NextResponse> {
  let roomCode = "";
  let playerId: string | null = null;
  const ip = getClientIpFromHeaders(request.headers);
  const roomToken = getRoomTokenFromHeaders(request.headers);

  try {
    const body = (await request.json()) as TBody;
    const parsed = options.parse(body);
    roomCode = parsed.roomCode;
    playerId = parsed.playerId;

    if (!roomCode || !playerId || !roomToken) {
      return NextResponse.json({ error: "Missing room code, player id, or room token." }, { status: 400 });
    }

    await enforceRateLimit({
      roomCode,
      actorKey: playerId,
      action: options.action,
      limit: options.rateLimit.limit,
      windowSeconds: options.rateLimit.windowSeconds
    });

    const state = await options.run({ roomCode, playerId, roomToken });
    queueAuditEvent({ roomCode, playerId, action: options.action, status: "success", ip });

    return NextResponse.json({ state: sanitizeStateForPlayer(state, playerId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    if (roomCode) {
      await logAuditEvent({
        roomCode,
        playerId,
        action: options.action,
        status: "denied",
        reason: message,
        ip
      });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export function parseRoomBody(body: { roomCode?: string; playerId?: string }) {
  return {
    roomCode: normalizeRoomCode(body.roomCode ?? ""),
    playerId: body.playerId?.trim() ?? ""
  };
}
