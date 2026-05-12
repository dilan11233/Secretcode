"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { GlassCard } from "@/components/glass-card";
import { ReviewModal } from "@/components/review-modal";
import { createRoomClient } from "@/lib/supabase";
import type { GameState, Player, Team } from "@/lib/types";

interface Props {
  roomCode: string;
  roomToken: string;
  nickname: string;
  isHost: boolean;
  hostRole?: "manager" | "employee";
}

const roomStorageKey = (roomCode: string) => `secretcode:${roomCode}:session`;

export function RoomClient({ roomCode, roomToken, nickname, isHost, hostRole }: Props) {
  const router = useRouter();
  const [client] = useState(() => createRoomClient(roomToken));
  const [state, setState] = useState<GameState | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [clueWord, setClueWord] = useState("");
  const [clueNumber, setClueNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-room-token": roomToken
    }),
    [roomToken]
  );

  // Davet linkini kopyalayan fonksiyon
  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/join-room?code=${roomCode}&rt=${roomToken}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      alert("Davet linki kopyalandı! Arkadaşına gönder.");
    });
  };

  const refreshState = async (playerId: string) => {
    const res = await fetch(`/api/room/state?roomCode=${roomCode}&playerId=${playerId}`, {
      headers: { "x-room-token": roomToken }
    });
    if (!res.ok) return;
    const data = (await res.json()) as { state: GameState };
    setState(data.state);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const fromStorage = localStorage.getItem(roomStorageKey(roomCode));
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
      } catch {
        setError("Unable to join this room. Check room code/token.");
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [apiHeaders, roomCode, nickname, isHost]);

  useEffect(() => {
    const channel = client
      .channel(`room-${roomCode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_events", filter: `room_code=eq.${roomCode}` },
        () => {
          if (player) {
            void refreshState(player.id);
          }
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, roomCode, player]);

  useEffect(() => {
    if (!player) return;
    const interval = window.setInterval(() => {
      void refreshState(player.id);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [player, roomCode]);

  useEffect(() => {
    if (!state || !player) return;
    const fromState = state.players.find((p) => p.id === player.id);
    if (fromState) setPlayer(fromState);
  }, [state, player]);

  const myTeam = player?.team ?? null;
  const iAmClueGiver = !!player?.isClueGiver;
  const iAmHost = !!player && !!state && state.hostPlayerId === player.id;

  const canGuess = useMemo(() => {
    if (!state || !myTeam || iAmClueGiver) return false;
    return state.phase === "playing" && state.turn === myTeam;
  }, [state, myTeam, iAmClueGiver]);

  const postAction = async (path: string, body: Record<string, unknown>) => {
    if (!player) return;
    const res = await fetch(path, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify({ roomCode, playerId: player.id, ...body })
    });
    const data = (await res.json()) as { error?: string; state?: GameState };
    if (!res.ok || !data.state) {
      setError(data.error ?? "Action failed.");
      return;
    }
    setState(data.state);
  };

  const setTeam = async (team: Team) => {
    if (!state || !player || state.phase !== "lobby") return;
    await postAction("/api/room/team", { team });
  };

  const setRole = async (isManager: boolean) => {
    if (!state || !player || state.phase !== "lobby") return;
    await postAction("/api/room/role", { isManager });
  };

  const onStartGame = async () => {
    if (!state || !player || !iAmHost) return;
    await postAction("/api/room/start", {});
  };

  const onReveal = async (cardId: string) => {
    if (!state || !canGuess) return;
    await postAction("/api/room/reveal", { cardId });
  };

  const onEndTurn = async () => {
    if (!state || !player || !player.team || state.turn !== player.team || iAmClueGiver) return;
    await postAction("/api/room/end-turn", {});
  };

  const submitClue = async () => {
    if (!state || !player || !player.team || !iAmClueGiver || state.turn !== player.team) return;
    if (!clueWord.trim()) return;
    const clueLower = clueWord.trim().toLowerCase();
    const boardHasWord = state.cards.some((card) => card.term.toLowerCase() === clueLower);
    if (boardHasWord) return;
    await postAction("/api/room/clue", { clue: clueWord.trim(), number: clueNumber });
    setClueWord("");
    setClueNumber(1);
  };

  if (loading || !state) return <div className="p-8 text-white">Loading room...</div>;
  if (error) return <div className="p-8 text-red-200">{error}</div>;

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-4 rounded-xl border border-white/40 px-3 py-2 text-white hover:bg-white/10"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-black text-lilac">Room {roomCode}</h1>
          <p className="text-sm text-white/80">Turn: {state.turn === "blue" ? "Blue" : "Green"} Group</p>
        </div>
        
        <button 
          onClick={copyInviteLink}
          className="flex items-center justify-center gap-2 rounded-xl bg-lilac px-6 py-3 font-bold text-purpleNight hover:bg-lilac/90 transition-all shadow-lg shadow-lilac/20"
        >
          <span>Invite Friends 🔗</span>
        </button>
      </div>

      <ReviewModal review={state.review} onClose={() => setState({ ...state, review: null })} />

      {state.phase === "lobby" ? (
        <section className="grid gap-4 md:grid-cols-2">
          <GlassCard>
            <h2 className="text-xl font-bold">Players</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {state.players.map((p) => (
                <li key={p.id} className="bg-white/5 p-2 rounded-lg">
                  <span className="font-bold text-lilac">{p.nickname}</span> 
                  {p.isHost ? " (Host)" : ""} 
                  <span className="opacity-70">
                    {p.team ? ` - ${p.team.toUpperCase()} Team` : " - No Team"} 
                    {p.isClueGiver ? " (Manager)" : " (Employee)"}
                  </span>
                </li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard>
            <h2 className="text-xl font-bold">Your Setup</h2>
            <p className="mt-3 text-sm text-white/80 mb-4">1. Choose your role:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => void setRole(true)}
                className={`rounded-xl px-4 py-2 text-white transition-all ${
                  iAmClueGiver ? "bg-yellow-600 ring-2 ring-yellow-400 font-bold" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                Manager
              </button>
              <button
                onClick={() => void setRole(false)}
                className={`rounded-xl px-4 py-2 text-white transition-all ${
                  !iAmClueGiver && player ? "bg-cyan-600 ring-2 ring-cyan-400 font-bold" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                Employee
              </button>
            </div>
            <p className="mt-3 text-sm text-white/80 mb-4">2. Choose your team:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => void setTeam("blue")}
                className={`rounded-xl px-4 py-2 text-white transition-all ${
                  player?.team === "blue" ? "bg-blue-600 ring-2 ring-blue-400 font-bold" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                Blue Team
              </button>
              <button
                onClick={() => void setTeam("green")}
                className={`rounded-xl px-4 py-2 text-white transition-all ${
                  player?.team === "green" ? "bg-green-600 ring-2 ring-green-400 font-bold" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                Green Team
              </button>
            </div>
            {iAmHost && (
              <button
                onClick={() => void onStartGame()}
                className="mt-6 w-full rounded-xl bg-lilac py-3 font-black text-purpleNight hover:opacity-90 disabled:opacity-40"
              >
                START GAME
              </button>
            )}
          </GlassCard>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <GlassCard>
            <div className="mb-4 flex justify-between text-sm font-bold">
              <p className="text-blue-400">Blue: {state.scores.blue}</p>
              <p className="text-green-400">Green: {state.scores.green}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {state.cards.map((card) => {
                const showRole = iAmClueGiver;
                let bgColor = "bg-white/10";
                
                if (card.revealed || showRole) {
                  if (card.role === "X") bgColor = "bg-red-900 border-2 border-red-700";
                  else if (card.role === "N") bgColor = "bg-yellow-600 border-2 border-yellow-500";
                  else if (card.role === "blue") bgColor = "bg-blue-600 border-2 border-blue-400";
                  else if (card.role === "green") bgColor = "bg-green-600 border-2 border-green-400";
                }
                
                return (
                  <button
                    key={card.id}
                    onClick={() => void onReveal(card.id)}
                    disabled={!canGuess || card.revealed}
                    className={`${bgColor} min-h-[100px] rounded-xl p-2 text-center text-sm font-bold transition hover:scale-[1.02] disabled:opacity-80`}
                  >
                    <p className="uppercase tracking-wider">{card.term}</p>
                  </button>
                );
              })}
            </div>
            {!iAmClueGiver && canGuess && (
              <button onClick={() => void onEndTurn()} className="mt-6 w-full rounded-xl border-2 border-white/20 py-3 font-bold hover:bg-white/10 text-white">
                End Turn
              </button>
            )}
            {state.winner && (
              <div className="mt-6 bg-lilac p-4 rounded-xl text-center">
                <p className="text-xl font-black text-purpleNight uppercase">Team {state.winner} Wins!</p>
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <h3 className="text-lg font-bold">Clue Panel</h3>
            {iAmClueGiver && state.turn === player?.team ? (
              <div className="mt-3 space-y-2">
                <input
                  value={clueWord}
                  onChange={(e) => setClueWord(e.target.value)}
                  placeholder="One-word clue"
                  className="w-full rounded-xl border border-white/30 bg-white/10 p-3 text-white"
                />
                <input
                  type="number"
                  min={1}
                  value={clueNumber}
                  onChange={(e) => setClueNumber(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/30 bg-white/10 p-3 text-white"
                />
                <button onClick={() => void submitClue()} className="w-full rounded-xl bg-lilac py-3 font-bold text-purpleNight">
                  Send Clue
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm italic opacity-60 text-center py-4 border border-dashed border-white/20 rounded-xl">
                {state.turn === player?.team ? "Waiting for Manager's clue..." : "Waiting for opponent's turn..."}
              </p>
            )}
            
            <h4 className="mt-6 font-semibold border-b border-white/10 pb-2">Clue History</h4>
            <ul className="mt-3 space-y-2 text-sm overflow-y-auto max-h-[300px]">
              {[...state.clueHistory].reverse().map((entry, idx) => (
                <li key={idx} className={`p-3 rounded-xl ${entry.team === 'blue' ? 'bg-blue-900/30 border-l-4 border-blue-500' : 'bg-green-900/30 border-l-4 border-green-500'}`}>
                  <p className="text-xs font-bold uppercase opacity-60">{entry.by}</p>
                  <p className="text-lg font-black">{entry.clue} <span className="text-lilac">[{entry.number}]</span></p>
                </li>
              ))}
            </ul>
          </GlassCard>
        </section>
      )}
    </main>
  );
}