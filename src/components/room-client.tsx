"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { LoadingState } from "@/components/loading-state";
import { ReviewModal } from "@/components/review-modal";
import { RoomCluePanel, RoomGameBoard } from "@/components/room/room-game";
import { RoomLobby } from "@/components/room/room-lobby";
import { teamDisplayName } from "@/lib/labels";
import { createRoomClient } from "@/lib/supabase";
import type { GameState, Player, Team } from "@/lib/types";

interface Props {
  roomCode: string;
  roomToken: string;
  nickname: string;
  isHost: boolean;
  forceNewSession?: boolean;
  hostTeam?: Team;
  hostRole?: "manager" | "employee";
}

const roomStorageKey = (roomCode: string) => `secretcode:${roomCode}:session`;

export function RoomClient({ roomCode, roomToken, nickname, isHost, forceNewSession = false, hostTeam, hostRole }: Props) {
  const router = useRouter();
  const [client] = useState(() => createRoomClient(roomToken));
  const [state, setState] = useState<GameState | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [clueWord, setClueWord] = useState("");
  const [clueNumber, setClueNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedReviewKey, setDismissedReviewKey] = useState<string | null>(null);
  const initStartedRef = useRef(false);

  const apiHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-room-token": roomToken
    }),
    [roomToken]
  );

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/join-room?code=${roomCode}&rt=${roomToken}`;
    void navigator.clipboard.writeText(inviteUrl).then(() => {
      alert("Invite link copied. Share it with your teammates.");
    });
  };

  const refreshState = useCallback(
    async (playerId: string) => {
      const res = await fetch(`/api/room/state?roomCode=${roomCode}&playerId=${playerId}`, {
        headers: { "x-room-token": roomToken }
      });
      if (!res.ok) return;
      const data = (await res.json()) as { state: GameState };
      setState(data.state);
    },
    [roomCode, roomToken]
  );

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const init = async () => {
      try {
        const fromStorage = forceNewSession ? null : localStorage.getItem(roomStorageKey(roomCode));
        const parsed = fromStorage ? (JSON.parse(fromStorage) as { id: string }) : null;
        const playerId = parsed?.id ?? nanoid(8);
        const res = await fetch("/api/room/join", {
          method: "POST",
          headers: apiHeaders,
          body: JSON.stringify({
            roomCode,
            nickname,
            playerId,
            hostHint: isHost,
            hostTeam: isHost ? hostTeam : undefined,
            hostRole: isHost ? hostRole : undefined
          })
        });
        const data = (await res.json()) as { error?: string; state?: GameState; playerId?: string };
        if (!res.ok || !data.state || !data.playerId) {
          setError(data.error ?? "Unable to join this room.");
          return;
        }
        const me = data.state.players.find((p) => p.id === data.playerId) ?? null;
        if (!me) {
          setError("Failed to restore player session.");
          return;
        }
        localStorage.setItem(roomStorageKey(roomCode), JSON.stringify({ id: me.id, nickname: me.nickname }));
        setPlayer(me);
        setState(data.state);
        if (forceNewSession) {
          const params = new URLSearchParams({
            nick: me.nickname,
            rt: roomToken
          });
          router.replace(`/room/${roomCode}?${params.toString()}`);
        }
      } catch {
        setError("Unable to join this room. Check room code and invite token.");
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [apiHeaders, roomCode, nickname, isHost, forceNewSession, hostTeam, hostRole, roomToken, router]);

  useEffect(() => {
    if (!player) return;
    const channel = client
      .channel(`room-${roomCode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_events", filter: `room_code=eq.${roomCode}` },
        () => void refreshState(player.id)
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [client, roomCode, player, refreshState]);

  useEffect(() => {
    if (!player) return;
    const interval = window.setInterval(() => void refreshState(player.id), 8000);
    return () => window.clearInterval(interval);
  }, [player, refreshState]);

  useEffect(() => {
    if (!state || !player) return;
    const fromState = state.players.find((p) => p.id === player.id);
    if (fromState) {
      setPlayer((current) => (current?.id === fromState.id ? fromState : current));
    }
  }, [state, player]);

  const iAmClueGiver = !!player?.isClueGiver;
  const iAmHost = !!player && !!state && state.hostPlayerId === player.id;
  const myTeam = player?.team ?? null;

  const canGuess = useMemo(() => {
    if (!state || !myTeam || iAmClueGiver) return false;
    return (
      state.phase === "playing" &&
      state.turn === myTeam &&
      !!state.activeClue &&
      state.activeClue.team === myTeam &&
      state.guessesRemaining > 0 &&
      !state.winner
    );
  }, [state, myTeam, iAmClueGiver]);

  const submitClue = async () => {
    if (!state || !clueWord.trim()) {
      setError("Enter a one-word clue.");
      return;
    }
    const clueLower = clueWord.trim().toLowerCase();
    if (state.cards.some((c) => c.term.toLowerCase() === clueLower)) {
      setError("Clue cannot match a word on the board.");
      return;
    }
    const ok = await postAction("/api/room/clue", { clue: clueWord.trim(), number: clueNumber });
    if (ok) {
      setClueWord("");
      setClueNumber(1);
    }
  };

  const postAction = async (path: string, body: Record<string, unknown> = {}) => {
    if (!player) return false;
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify({ roomCode, playerId: player.id, ...body })
    });
    const data = (await res.json()) as { error?: string; state?: GameState };
    if (!res.ok || !data.state) {
      setError(data.error ?? "Action failed.");
      return false;
    }
    setState(data.state);
    return true;
  };

  const dismissReview = async () => {
    const res = await fetch("/api/room/dismiss-review", {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify({ roomCode })
    });
    if (res.ok) {
      const data = (await res.json()) as { state: GameState };
      setState(data.state);
    }
  };

  if (loading || !state || !player) {
    return <LoadingState label="Loading room" />;
  }
  if (error && !state) {
    return <div className="p-8 text-red-200">{error}</div>;
  }

  const reviewKey = state.review ? JSON.stringify(state.review) : null;
  const activeTeamLabel = teamDisplayName(state.turn);

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 rounded-xl border border-white/40 px-3 py-2 text-white hover:bg-white/10"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-black text-lilac">Room {roomCode}</h1>
          <p className="text-sm text-white/80">
            {state.phase === "lobby" ? "Lobby" : `Turn: ${activeTeamLabel}`}
          </p>
        </div>
        <button
          type="button"
          onClick={copyInviteLink}
          className="flex items-center justify-center gap-2 rounded-xl bg-lilac px-6 py-3 font-bold text-purpleNight shadow-lg shadow-lilac/20 transition-all hover:bg-lilac/90"
        >
          Invite Friends
        </button>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-500/20 p-3 text-sm text-red-200">{error}</p>}

      <ReviewModal
        review={reviewKey !== dismissedReviewKey ? state.review : null}
        onClose={() => {
          setDismissedReviewKey(reviewKey);
          void dismissReview();
        }}
      />

      {state.phase === "lobby" ? (
        <RoomLobby
          state={state}
          player={player}
          isHost={iAmHost}
          isClueGiver={iAmClueGiver}
          onSelectTeam={(team) => void postAction("/api/room/team", { team })}
          onSelectRole={(isClueGiver) => void postAction("/api/room/role", { isClueGiver })}
          onStart={() => void postAction("/api/room/start")}
        />
      ) : (
        <section className="grid items-start gap-4 xl:grid-cols-[260px_minmax(0,1fr)_260px]">
          <TeamColumn
            state={state}
            player={player}
            team="blue"
            clueWord={clueWord}
            clueNumber={clueNumber}
            onClueWordChange={setClueWord}
            onClueNumberChange={setClueNumber}
            onSubmitClue={submitClue}
          />
          <RoomGameBoard
            state={state}
            player={player}
            canGuess={canGuess}
            showCardRoles={iAmClueGiver}
            onReveal={(cardId) => void postAction("/api/room/reveal", { cardId })}
            onEndTurn={() => void postAction("/api/room/end-turn")}
          />
          <TeamColumn
            state={state}
            player={player}
            team="green"
            clueWord={clueWord}
            clueNumber={clueNumber}
            onClueWordChange={setClueWord}
            onClueNumberChange={setClueNumber}
            onSubmitClue={submitClue}
          />
        </section>
      )}
    </main>
  );
}

function TeamColumn({
  state,
  player,
  team,
  clueWord,
  clueNumber,
  onClueWordChange,
  onClueNumberChange,
  onSubmitClue
}: {
  state: GameState;
  player: Player;
  team: Team;
  clueWord: string;
  clueNumber: number;
  onClueWordChange: (value: string) => void;
  onClueNumberChange: (value: number) => void;
  onSubmitClue: () => void;
}) {
  return (
    <div className="space-y-4">
      <TeamRail state={state} team={team} currentPlayerId={player.id} />
      <RoomCluePanel
        state={state}
        player={player}
        team={team}
        clueWord={clueWord}
        clueNumber={clueNumber}
        onClueWordChange={onClueWordChange}
        onClueNumberChange={onClueNumberChange}
        onSubmitClue={onSubmitClue}
      />
    </div>
  );
}

function TeamRail({ state, team, currentPlayerId }: { state: GameState; team: Team; currentPlayerId: string }) {
  const members = state.players.filter((p) => p.team === team);
  const clueGiver = members.find((p) => p.isClueGiver);
  const border = team === "blue" ? "border-sky-300/60" : "border-emerald-300/60";
  const bg = team === "blue" ? "bg-sky-500/15" : "bg-emerald-500/15";
  const text = team === "blue" ? "text-sky-100" : "text-emerald-100";
  const scoreTarget = team === "blue" ? 9 : 8;

  return (
    <aside className={`rounded-xl border ${border} ${bg} p-4 shadow-glass backdrop-blur-lg`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-bold uppercase ${text}`}>{teamDisplayName(team)}</p>
          <h2 className="text-3xl font-black">{state.scores[team]}</h2>
        </div>
        <span className="rounded-lg bg-black/20 px-2 py-1 text-xs font-bold text-white/70">
          / {scoreTarget}
        </span>
      </div>
      <p className="mt-2 text-xs text-white/60">
        {state.turn === team && !state.winner ? "Current turn" : state.winner === team ? "Winner" : "Waiting"}
      </p>
      <div className="mt-4 space-y-2">
        {members.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/20 p-3 text-sm text-white/50">No players yet.</p>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className={`rounded-lg bg-black/20 p-3 text-sm ${member.id === currentPlayerId ? "ring-2 ring-lilac" : ""}`}
            >
              <p className="font-bold text-white">{member.nickname}</p>
              <p className="text-xs text-white/60">{member.isClueGiver ? "Manager" : "Employee"}</p>
            </div>
          ))
        )}
      </div>
      <div className="mt-4 rounded-lg bg-black/20 p-3 text-xs text-white/70">
        <span className="font-bold text-white">Manager:</span> {clueGiver?.nickname ?? "Not selected"}
      </div>
    </aside>
  );
}
