/**
 * Shared sim types — the runtime mirror of the JSON contract in
 * `specs/001-ghost-roster-v1/data-model.md`. Everything here is plain data; the sim
 * functions over it are pure and seeded (constitution II).
 */

/** The six mutually-exclusive plate-appearance outcomes. HBP is folded into `bb`. */
export const OUTCOMES = ["bb", "b1", "b2", "b3", "hr", "out"] as const;
export type Outcome = (typeof OUTCOMES)[number];

/** Per-PA outcome probabilities, summing to 1.0. */
export type OutcomeVector = Record<Outcome, number>;

export type Hitter = {
  playerId: string;
  name: string;
  pos: string[];
  vector: OutcomeVector;
};

export type Pitcher = {
  playerId: string;
  name: string;
  role: "SP" | "RP";
  allowed: OutcomeVector;
  stamina: number;
};

/**
 * A drafted roster: 9 hitters, 3 starters, 1 reliever (D-002). Lengths are
 * invariants enforced by the draft, not the type system (TS has no fixed-length
 * array literal); the sim asserts them where it matters.
 */
export type Roster = {
  lineup: Hitter[];
  rotation: Pitcher[];
  bullpen: Pitcher[];
};

/**
 * The opposing side. v1 is the era-average league team: both vectors are the
 * neutral league baseline. The same shape is the P2 PvP seam — a second roster is
 * reduced to an OpponentModel by composition, not a rewrite (constitution II).
 */
export type OpponentModel = {
  batter: OutcomeVector;
  pitcher: OutcomeVector;
};

export type LineScore = { runs: number; hits: number; innings: number[] };

export type BattingLine = {
  playerId: string;
  pa: number;
  h: number;
  b2: number;
  b3: number;
  hr: number;
  bb: number;
  rbi: number;
  r: number;
};

export type GameLog = {
  game: number;
  home: LineScore;
  away: LineScore;
  batting: BattingLine[];
  win: boolean;
};

export type Highlights = {
  longestWinStreak: number;
  noHitters: number;
  bestGame: number;
  worstGame: number;
  topPerformer: string;
};

export type SeasonResult = {
  record: { w: number; l: number };
  gameLogs: GameLog[];
  highlights: Highlights;
  grade: string;
};
