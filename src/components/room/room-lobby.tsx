"use client";

import { GlassCard } from "@/components/glass-card";
import { teamColorLabel } from "@/lib/labels";
import type { GameState, Player, Team } from "@/lib/types";

interface Props {
  state: GameState;
  player: Player;
  isHost: boolean;
  isClueGiver: boolean;
  onSelectRole: (isClueGiver: boolean) => void;
  onSelectTeam: (team: Team) => void;
  onStart: () => void;
}

export function RoomLobby({ state, player, isHost, isClueGiver, onSelectRole, onSelectTeam, onStart }: Props) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <GlassCard>
        <h2 className="text-xl font-bold">Players</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {state.players.map((p) => (
            <li key={p.id} className="rounded-lg bg-white/5 p-2">
              <span className="font-bold text-lilac">{p.nickname}</span>
              {p.isHost ? " (Host)" : ""}
              <span className="opacity-70">
                {p.team ? ` — ${teamColorLabel(p.team)}` : " — No team"}
                {p.isClueGiver ? " · Manager" : " · Employee"}
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-bold">Your Setup</h2>
        <p className="mb-4 mt-3 text-sm text-white/80">1. Choose your team:</p>
        <TeamButtons player={player} onSelectTeam={onSelectTeam} />
        <p className="mb-4 mt-4 text-sm text-white/80">2. Choose your role:</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSelectRole(true)}
            disabled={!player.team}
            className={`rounded-xl px-4 py-2 text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
              isClueGiver ? "bg-yellow-600 font-bold ring-2 ring-yellow-400" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            Manager
          </button>
          <button
            type="button"
            onClick={() => onSelectRole(false)}
            disabled={!player.team}
            className={`rounded-xl px-4 py-2 text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
              player.team && !isClueGiver
                ? "bg-cyan-600 font-bold ring-2 ring-cyan-400"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            Employee
          </button>
        </div>

        {isHost ? (
          <button
            type="button"
            onClick={onStart}
            className="mt-6 w-full rounded-xl bg-lilac py-3 font-black text-purpleNight hover:opacity-90"
          >
            START GAME
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="mt-6 w-full cursor-not-allowed rounded-xl border border-white/20 bg-white/10 py-3 font-black text-white/70"
          >
            WAITING FOR HOST
          </button>
        )}
      </GlassCard>
    </section>
  );
}

function TeamButtons({ player, onSelectTeam }: { player: Player; onSelectTeam: (team: Team) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onSelectTeam("blue")}
        className={`rounded-xl px-4 py-2 text-white transition-all ${
          player.team === "blue" ? "bg-blue-600 font-bold ring-2 ring-blue-400" : "bg-white/10 hover:bg-white/20"
        }`}
      >
        Team A (Blue)
      </button>
      <button
        type="button"
        onClick={() => onSelectTeam("green")}
        className={`rounded-xl px-4 py-2 text-white transition-all ${
          player.team === "green" ? "bg-green-600 font-bold ring-2 ring-green-400" : "bg-white/10 hover:bg-white/20"
        }`}
      >
        Team B (Green)
      </button>
    </div>
  );
}
