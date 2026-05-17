import { learningTerms } from "@/data/terms";
import type { BoardCard, CardRole, GameState, ReviewEntry, Team } from "@/lib/types";

const CARD_ROLE_TEMPLATE: CardRole[] = [
  ...Array(9).fill("blue"),
  ...Array(8).fill("green"),
  ...Array(7).fill("N"),
  "X"
];

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateBoard(): BoardCard[] {
  const terms = shuffle(learningTerms).slice(0, 25);
  const roles = shuffle(CARD_ROLE_TEMPLATE);
  return terms.map((term, idx) => ({
    id: `card-${idx + 1}`,
    termId: term.id,
    term: term.term,
    role: roles[idx],
    revealed: false
  }));
}

export function createInitialGameState(roomCode: string): GameState {
  return {
    roomCode,
    phase: "lobby",
    players: [],
    hostPlayerId: null,
    cards: [],
    turn: "blue",
    scores: { blue: 9, green: 8 },
    clueHistory: [],
    activeClue: null,
    guessesRemaining: 0,
    review: null,
    winner: null
  };
}

export function startGame(state: GameState): GameState {
  return {
    ...state,
    phase: "playing",
    cards: generateBoard(),
    scores: { blue: 9, green: 8 },
    turn: "blue",
    activeClue: null,
    guessesRemaining: 0,
    winner: null,
    review: null
  };
}

function getReview(term: string, reason: string): ReviewEntry {
  const found = learningTerms.find((t) => t.term === term);
  return {
    cardId: found?.id ?? term,
    term,
    definition: found?.definition ?? "Definition unavailable.",
    isoStandard: found?.isoStandard ?? "N/A",
    reason
  };
}

export function revealCard(state: GameState, cardId: string): GameState {
  if (state.phase !== "playing" || state.winner) return state;
  const selected = state.cards.find((c) => c.id === cardId && !c.revealed);
  if (!selected) return state;

  const cards = state.cards.map((card) =>
    card.id === cardId ? { ...card, revealed: true } : card
  );

  if (selected.role === "X") {
    return {
      ...state,
      cards,
      winner: state.turn === "blue" ? "green" : "blue",
      phase: "finished",
      activeClue: null,
      guessesRemaining: 0,
      review: getReview(selected.term, "Forbidden card selected. Instant loss.")
    };
  }

  const scores = { ...state.scores };
  if (selected.role === "blue" || selected.role === "green") {
    scores[selected.role] = Math.max(0, scores[selected.role] - 1);
  }

  const currentTeam = state.turn;
  let nextTurn: Team = currentTeam;
  let reason = "Correct guess for your team.";
  let activeClue = state.activeClue;
  let guessesRemaining = Math.max(0, state.guessesRemaining - 1);

  if (selected.role === "N") {
    nextTurn = currentTeam === "blue" ? "green" : "blue";
    reason = "Neutral card selected. Turn ended.";
  } else if (selected.role !== currentTeam) {
    nextTurn = currentTeam === "blue" ? "green" : "blue";
    reason = "Wrong team card selected. Turn ended.";
  } else if (guessesRemaining === 0) {
    nextTurn = currentTeam === "blue" ? "green" : "blue";
    reason = "Correct guess. Clue limit reached. Turn ended.";
  }

  if (nextTurn !== currentTeam) {
    activeClue = null;
    guessesRemaining = 0;
  }

  const winner = scores.blue === 0 ? "blue" : scores.green === 0 ? "green" : null;
  return {
    ...state,
    cards,
    scores,
    turn: winner ? state.turn : nextTurn,
    activeClue: winner ? null : activeClue,
    guessesRemaining: winner ? 0 : guessesRemaining,
    winner,
    phase: winner ? "finished" : state.phase,
    review: getReview(selected.term, reason)
  };
}

export function endTurn(state: GameState): GameState {
  if (state.phase !== "playing") return state;
  return {
    ...state,
    turn: state.turn === "blue" ? "green" : "blue",
    activeClue: null,
    guessesRemaining: 0
  };
}
