"use client";

import { useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { teamDisplayName } from "@/lib/labels";
import type { BoardCard, ClueEntry, GameState, Player, Team } from "@/lib/types";

interface BoardProps {
  state: GameState;
  player: Player;
  canGuess: boolean;
  showCardRoles: boolean;
  onReveal: (cardId: string) => void;
  onEndTurn: () => void;
}

export function RoomGameBoard({ state, player, canGuess, showCardRoles, onReveal, onEndTurn }: BoardProps) {
  const activeClue = state.activeClue;
  const [definitionCard, setDefinitionCard] = useState<BoardCard | null>(null);

  return (
    <GlassCard className="w-full">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase text-white/50">Game Board</p>
          <h2 className="text-2xl font-black text-white">Find your team terms</h2>
        </div>
        <div className="rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm">
          <p className="text-xs font-bold uppercase text-white/50">Active Turn</p>
          <p className={state.turn === "blue" ? "font-black text-blue-200" : "font-black text-emerald-200"}>
            {teamDisplayName(state.turn)}
          </p>
        </div>
      </div>

      {activeClue ? (
        <div className="mb-4 rounded-xl border border-lilac/40 bg-lilac/15 p-4">
          <p className="text-xs font-bold uppercase text-white/60">Active Clue</p>
          <p className="text-2xl font-black text-lilac">
            {activeClue.clue} <span className="text-white/80">[{state.guessesRemaining} left]</span>
          </p>
          <p className="text-xs text-white/60">
            {teamDisplayName(activeClue.team)} by {activeClue.by}
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-dashed border-white/20 bg-black/15 p-4 text-sm text-white/60">
          Waiting for {teamDisplayName(state.turn)} Manager to send a clue.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {state.cards.map((card) => (
          <CardButton
            key={card.id}
            card={card}
            showRole={showCardRoles}
            disabled={showCardRoles ? false : !canGuess || card.revealed}
            onClick={() => {
              if (showCardRoles) {
                setDefinitionCard(card);
                return;
              }
              onReveal(card.id);
            }}
          />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-bold">
        <div className="rounded-xl border border-blue-300/40 bg-blue-500/15 p-3 text-blue-100">
          {teamDisplayName("blue")}: {state.scores.blue} left
        </div>
        <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/15 p-3 text-emerald-100">
          {teamDisplayName("green")}: {state.scores.green} left
        </div>
      </div>

      {state.cards.length === 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: 25 }).map((_, index) => (
            <div key={index} className="min-h-[104px] rounded-xl border border-dashed border-white/10 bg-white/5" />
          ))}
        </div>
      )}

      {!player.isClueGiver && canGuess && (
        <button
          type="button"
          onClick={onEndTurn}
          className="mt-6 w-full rounded-xl border-2 border-white/20 py-3 font-bold text-white hover:bg-white/10"
        >
          End Turn
        </button>
      )}
      {!player.isClueGiver && state.phase === "playing" && state.turn === player.team && !canGuess && !state.winner && (
        <p className="mt-4 rounded-xl border border-dashed border-white/20 p-3 text-center text-sm text-white/60">
          You can guess after your Manager sends a clue.
        </p>
      )}
      {state.winner && (
        <div className="mt-6 rounded-xl bg-lilac p-4 text-center">
          <p className="text-xl font-black uppercase text-purpleNight">{teamDisplayName(state.winner)} wins!</p>
        </div>
      )}

      {definitionCard && showCardRoles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="glass w-full max-w-xl rounded-2xl p-6">
            <p className="text-xs font-bold uppercase text-white/50">Word Explanation</p>
            <h2 className="mt-2 text-xl font-bold text-lilac">{definitionCard.term}</h2>
            <p className="mt-3 text-sm leading-6 text-white/90">
              {definitionCard.definition ?? "Definition unavailable."}
            </p>
            <button
              type="button"
              onClick={() => setDefinitionCard(null)}
              className="mt-5 rounded-xl bg-lilac px-4 py-2 font-semibold text-purpleNight"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function CardButton({
  card,
  showRole,
  disabled,
  onClick
}: {
  card: BoardCard;
  showRole: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  let bgColor = "bg-white/10";
  let label = "";
  const revealedClasses = card.revealed ? "opacity-70 ring-2 ring-white/25" : "";
  if (card.revealed || showRole) {
    if (card.role === "X") {
      bgColor = "border-2 border-red-500 bg-red-900";
      label = "Forbidden";
    } else if (card.role === "N") {
      bgColor = "border-2 border-amber-300 bg-amber-600";
      label = "Neutral";
    } else if (card.role === "blue") {
      bgColor = "border-2 border-blue-200 bg-blue-600";
      label = "Team A";
    } else if (card.role === "green") {
      bgColor = "border-2 border-emerald-200 bg-emerald-600";
      label = "Team B";
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${bgColor} ${revealedClasses} flex min-h-[104px] flex-col items-center justify-center rounded-xl p-3 text-center text-sm font-bold transition hover:scale-[1.02] disabled:opacity-80`}
    >
      <p className={`break-words uppercase ${card.revealed ? "text-white/75 line-through decoration-white decoration-2" : ""}`}>
        {card.term}
      </p>
      {card.revealed && (
        <span className="mt-2 rounded-md bg-black/35 px-2 py-1 text-[10px] uppercase tracking-wide text-white/80">
          Selected
        </span>
      )}
      {label && <span className="mt-2 rounded-md bg-black/25 px-2 py-1 text-[10px] uppercase text-white/80">{label}</span>}
    </button>
  );
}

interface CluePanelProps {
  state: GameState;
  player: Player;
  team: Team;
  clueWord: string;
  clueNumber: number;
  onClueWordChange: (value: string) => void;
  onClueNumberChange: (value: number) => void;
  onSubmitClue: () => void;
}

export function RoomCluePanel({
  state,
  player,
  team,
  clueWord,
  clueNumber,
  onClueWordChange,
  onClueNumberChange,
  onSubmitClue
}: CluePanelProps) {
  const isPanelTeamTurn = state.turn === team;
  const isMyTeamPanel = player.team === team;
  const canSubmit = player.isClueGiver && isMyTeamPanel && isPanelTeamTurn && !state.activeClue;
  const activeForTeam = state.activeClue?.team === team ? state.activeClue : null;
  const entries = state.clueHistory.filter((entry) => entry.team === team);
  const colorClasses =
    team === "blue"
      ? "border-sky-300/60 bg-sky-500/15 text-sky-100"
      : "border-emerald-300/60 bg-emerald-500/15 text-emerald-100";

  return (
    <GlassCard className={`border ${colorClasses}`}>
      <h3 className="text-lg font-bold">{teamDisplayName(team)} Clue</h3>
      {activeForTeam && (
        <div className="mt-3 rounded-xl bg-black/20 p-3">
          <p className="text-xs font-bold uppercase text-white/50">Current</p>
          <p className="text-xl font-black text-lilac">
            {activeForTeam.clue} <span className="text-white/80">[{state.guessesRemaining} left]</span>
          </p>
        </div>
      )}
      {canSubmit ? (
        <div className="mt-3 space-y-2">
          <input
            value={clueWord}
            onChange={(e) => onClueWordChange(e.target.value)}
            placeholder="One-word clue"
            className="w-full rounded-xl border border-white/30 bg-white/10 p-3 text-white"
          />
          <input
            type="number"
            min={1}
            max={9}
            value={clueNumber}
            onChange={(e) => onClueNumberChange(Number(e.target.value))}
            className="w-full rounded-xl border border-white/30 bg-white/10 p-3 text-white"
            aria-label="Number of related words"
          />
          <button
            type="button"
            onClick={onSubmitClue}
            className="w-full rounded-xl bg-lilac py-3 font-bold text-purpleNight"
          >
            Send Clue
          </button>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-white/20 py-4 text-center text-sm italic opacity-60">
          {isPanelTeamTurn
            ? activeForTeam
              ? "Employees are choosing cards."
              : "Waiting for this team's Manager..."
            : "Waiting for the other team..."}
        </p>
      )}

      <h4 className="mt-6 border-b border-white/10 pb-2 font-semibold">Clue History</h4>
      <ClueHistory entries={entries} />
    </GlassCard>
  );
}

function ClueHistory({ entries }: { entries: ClueEntry[] }) {
  if (entries.length === 0) {
    return <p className="mt-3 text-sm text-white/50">No clues yet.</p>;
  }

  return (
    <ul className="mt-3 max-h-[300px] space-y-2 overflow-y-auto text-sm">
      {entries.map((entry) => (
        <li
          key={`${entry.createdAt}-${entry.clue}`}
          className={`rounded-xl p-3 ${
            entry.team === "blue" ? "border-l-4 border-blue-500 bg-blue-900/30" : "border-l-4 border-green-500 bg-green-900/30"
          }`}
        >
          <p className="text-xs font-bold uppercase opacity-60">{entry.by}</p>
          <p className="text-lg font-black">
            {entry.clue} <span className="text-lilac">[{entry.number}]</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
