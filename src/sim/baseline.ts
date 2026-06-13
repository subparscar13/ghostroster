import type { OpponentModel, OutcomeVector } from "./types";

/**
 * The neutral baseline run environment (per-PA), summing to 1.0.
 *
 * This MUST stay byte-identical to `NEUTRAL` in the pipeline's `vectors.py`: every
 * player vector in `public/data/` was projected onto this baseline (era adjustment =
 * player_rate / league_rate × NEUTRAL). The log5 blend uses it as the league
 * denominator, so if the two drift apart the matchup math no longer matches the
 * data. Treated as a fixed, documented, flaggable reference point.
 */
export const NEUTRAL: OutcomeVector = {
  bb: 0.085,
  b1: 0.155,
  b2: 0.045,
  b3: 0.005,
  hr: 0.03,
  out: 0.68,
};

/**
 * The v1 opponent: an era-average league team. Because each player vector is
 * already normalized onto NEUTRAL, the average team's produced and allowed rates
 * are exactly the neutral baseline — so a player facing this opponent reproduces
 * their own vector (the blend reduces to identity; see `resolve.ts`).
 */
export const LEAGUE_AVERAGE_OPPONENT: OpponentModel = {
  batter: NEUTRAL,
  pitcher: NEUTRAL,
};
