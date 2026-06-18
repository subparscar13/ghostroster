/** App-side shapes for the committed static data (`public/data`). */

import type { OutcomeVector } from "@/sim/types";

/** One spin-index entry: a (franchise, decade) cell that meets the eligibility floor. */
export type SpinCell = {
  franchiseId: string;
  franchise: string;
  decade: number;
  chunk: string;
  counts: { hitters: number; sp: number; rp: number };
  allStar?: boolean; // franchise's strongest decade — the Sunday All-Star pool (D-015)
};

/** `teams.json` — the spin index. */
export type TeamsIndex = {
  edition: string;
  generatedFrom?: string;
  cells: SpinCell[];
};

export type HitterDisplay = {
  year: number;
  team: string;
  G: number;
  PA: number;
  AB: number;
  H: number;
  "2B": number;
  "3B": number;
  HR: number;
  BB: number;
  HBP: number;
  SO: number;
  AVG: string;
  OPS: string;
};

export type PitcherDisplay = {
  year: number;
  team: string;
  W: number;
  L: number;
  ERA: string;
  G: number;
  GS: number;
  IP: number;
  H: number;
  BB: number;
  SO: number;
  HR: number;
};

/** A draftable hitter — structurally a sim Hitter plus a display line + prestige. */
export type PoolHitter = {
  playerId: string;
  name: string;
  pos: string[];
  vector: OutcomeVector;
  display: HitterDisplay;
  allStar: boolean; // the drafted best-season was an All-Star season
  hof: boolean; // career Hall-of-Fame inductee
};

/** A draftable pitcher — structurally a sim Pitcher plus a display line + prestige. */
export type PoolPitcher = {
  playerId: string;
  name: string;
  role: "SP" | "RP";
  allowed: OutcomeVector;
  stamina: number;
  display: PitcherDisplay;
  allStar: boolean;
  hof: boolean;
};

/** `td/{franchiseId}-{decade}.json` — one team-decade pool. */
export type TeamDecadeChunk = {
  franchiseId: string;
  franchise: string;
  decade: number;
  hitters: PoolHitter[];
  pitchers: PoolPitcher[];
};

/** The 13 roster slots: 9 fielding positions (DH-loose) + 3 starters + 1 reliever. */
export type Slot =
  | "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF" | "DH"
  | "SP1" | "SP2" | "SP3" | "RP";

/** A completed draft pick: the player, the slot they fill, and their era tag. */
export type DraftPick = {
  slot: Slot;
  playerId: string;
  name: string;
  kind: "hitter" | "sp" | "rp";
  tag: string; // e.g. "1961 LAA"
  hitter?: PoolHitter;
  pitcher?: PoolPitcher;
};
