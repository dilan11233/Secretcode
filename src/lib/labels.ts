import type { Team } from "@/lib/types";

/** PDF: Team A / Team B — mapped to board colors in code. */
export const TEAM_LABELS: Record<Team, { name: string; color: string }> = {
  blue: { name: "Team A", color: "Blue" },
  green: { name: "Team B", color: "Green" }
};

export function teamDisplayName(team: Team): string {
  return TEAM_LABELS[team].name;
}

export function teamColorLabel(team: Team): string {
  return `${TEAM_LABELS[team].name} (${TEAM_LABELS[team].color})`;
}
