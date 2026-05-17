import type { GameState, Team } from "@/lib/types";
import { teamDisplayName } from "@/lib/labels";

const TEAMS: Team[] = ["blue", "green"];

export function validateLobbyForStart(state: GameState): void {
  if (state.phase !== "lobby") {
    throw new Error("Game has already started.");
  }
  if (state.players.length < 2) {
    throw new Error("At least 2 players are required to start.");
  }

  const unassigned = state.players.filter((p) => !p.team);
  if (unassigned.length > 0) {
    throw new Error("All players must choose a team before starting.");
  }

  for (const team of TEAMS) {
    const members = state.players.filter((p) => p.team === team);
    if (members.length === 0) {
      throw new Error(`${teamDisplayName(team)} needs at least one player.`);
    }
    const clueGivers = members.filter((p) => p.isClueGiver);
    if (clueGivers.length !== 1) {
      throw new Error(`${teamDisplayName(team)} must have exactly one Clue Giver.`);
    }
    if (members.filter((p) => !p.isClueGiver).length < 1) {
      throw new Error(`${teamDisplayName(team)} needs at least one Guesser.`);
    }
  }
}
