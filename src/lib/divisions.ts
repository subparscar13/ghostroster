/**
 * Daily "division of the day" (D-015). Each weekday is one of MLB's six *current*
 * divisions; the daily challenge may only spin that division's franchises (any decade).
 * Sunday is the All-Star pool: each franchise's strongest decade (the `allStar` cells
 * the pipeline marks in teams.json). Classic mode ignores all of this.
 *
 * Divisions use present-day alignment for every era — franchises are stored under their
 * current franchise id, so this is a clean 30 → 6 map.
 */

import type { SpinCell } from "./types";

export type Division = "ALE" | "ALC" | "ALW" | "NLE" | "NLC" | "NLW";
export type DailyTheme = Division | "ALLSTAR";

export const DIVISION_NAMES: Record<DailyTheme, string> = {
  ALE: "AL East",
  ALC: "AL Central",
  ALW: "AL West",
  NLE: "NL East",
  NLC: "NL Central",
  NLW: "NL West",
  ALLSTAR: "All-Stars",
};

const DIVISION_FRANCHISES: Record<Division, string[]> = {
  ALE: ["NYY", "BOS", "BAL", "TBD", "TOR"],
  ALC: ["CLE", "CHW", "DET", "MIN", "KCR"],
  ALW: ["OAK", "HOU", "ANA", "TEX", "SEA"],
  NLE: ["ATL", "PHI", "NYM", "WSN", "FLA"],
  NLC: ["STL", "CHC", "CIN", "PIT", "MIL"],
  NLW: ["LAD", "SFG", "ARI", "SDP", "COL"],
};

const FRANCHISE_DIVISION: Record<string, Division> = Object.fromEntries(
  Object.entries(DIVISION_FRANCHISES).flatMap(([div, ids]) => ids.map((id) => [id, div as Division])),
);

/** The current division for a franchise id (undefined if unmapped — shouldn't happen). */
export function divisionOf(franchiseId: string): Division | undefined {
  return FRANCHISE_DIVISION[franchiseId];
}

// Weekday → theme. UTC day-of-week: 0 Sun … 6 Sat. Sunday = All-Star pool;
// Mon–Sat cycle the six divisions (Wed = NL Central).
const WEEKDAY_THEME: DailyTheme[] = ["ALLSTAR", "ALE", "ALC", "NLC", "ALW", "NLE", "NLW"];

/** The theme for a daily date key (YYYY-MM-DD), derived from its UTC weekday —
 * deterministic and identical for everyone that day. */
export function dailyTheme(dateKey: string): DailyTheme {
  const [y, m, d] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  return WEEKDAY_THEME[weekday]!;
}

/** Display name of the day's theme, e.g. "NL Central" or "All-Stars". */
export function dailyThemeName(dateKey: string): string {
  return DIVISION_NAMES[dailyTheme(dateKey)];
}

/** The spinnable cells for the day: the theme division's franchises (any decade), or
 * the marquee `allStar` cell of every franchise on Sunday. */
export function eligibleCells(cells: SpinCell[], dateKey: string): SpinCell[] {
  const theme = dailyTheme(dateKey);
  if (theme === "ALLSTAR") return cells.filter((c) => c.allStar);
  return cells.filter((c) => divisionOf(c.franchiseId) === theme);
}
