export type Team = "blue" | "green";
export type CardRole = Team | "N" | "X";
export type Phase = "lobby" | "playing" | "finished";

export interface LearningTerm {
  id: string;
  term: string;
  definition: string;
  isoStandard: string;
  category: string;
}

export interface Player {
  id: string;
  nickname: string;
  team: Team | null;
  isClueGiver: boolean;
  isHost: boolean;
}

export interface BoardCard {
  id: string;
  termId: string;
  term: string;
  role: CardRole;
  revealed: boolean;
}

export interface ClueEntry {
  team: Team;
  clue: string;
  number: number;
  by: string;
  createdAt: string;
}

export interface ReviewEntry {
  cardId: string;
  term: string;
  definition: string;
  isoStandard: string;
  reason: string;
}

export interface GameState {
  roomCode: string;
  phase: Phase;
  players: Player[];
  hostPlayerId: string | null;
  cards: BoardCard[];
  turn: Team;
  scores: Record<Team, number>;
  clueHistory: ClueEntry[];
  review: ReviewEntry | null;
  winner: Team | null;
}
