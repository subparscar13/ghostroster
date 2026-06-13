/**
 * Plate-appearance resolution (T032): blend a batter's outcome vector against a
 * pitcher's allowed vector relative to the league baseline (log5 / odds-ratio), then
 * sample one outcome with the seeded RNG.
 *
 * Odds-ratio method (Tango): for each outcome the combined rate is proportional to
 * `batter × pitcher / league`, renormalized to sum to 1. Reductions that make it
 * sane:
 *   - batter vs the league-average pitcher (`pitcher = NEUTRAL`) → the batter's own
 *     vector, since `b × NEUTRAL / NEUTRAL = b`.
 *   - the league-average batter vs a pitcher → the pitcher's allowed vector.
 * So against the v1 era-average opponent a player plays to exactly their data
 * vector, and the same function does the full matchup for P2 PvP.
 */

import { NEUTRAL } from "./baseline.ts";
import type { Rng } from "./rng.ts";
import type { Outcome, OutcomeVector } from "./types.ts";
import { OUTCOMES } from "./types.ts";

/**
 * Combine batter and pitcher vectors via the odds ratio against `league`.
 * Returns a normalized OutcomeVector.
 */
export function blend(
  batter: OutcomeVector,
  pitcher: OutcomeVector,
  league: OutcomeVector = NEUTRAL,
): OutcomeVector {
  const raw = {} as Record<Outcome, number>;
  let sum = 0;
  for (const o of OUTCOMES) {
    const l = league[o];
    const v = l > 0 ? (batter[o] * pitcher[o]) / l : 0;
    raw[o] = v;
    sum += v;
  }
  // Degenerate inputs (e.g. all-zero) — fall back to the league baseline rather
  // than emitting NaNs. Cannot happen with real data (out is always sizable).
  if (sum <= 0) return { ...league };
  const out = {} as OutcomeVector;
  for (const o of OUTCOMES) out[o] = raw[o] / sum;
  return out;
}

/**
 * Sample one outcome from a (normalized) vector using a uniform draw in [0, 1).
 * The cumulative walk follows `OUTCOMES` order; the final `out` also absorbs any
 * floating-point residual so a draw of 0.999… can never fall through.
 */
export function sample(vec: OutcomeVector, rng: Rng): Outcome {
  const x = rng();
  let acc = 0;
  for (const o of OUTCOMES) {
    acc += vec[o];
    if (x < acc) return o;
  }
  return "out";
}

/** Blend + sample: resolve a single plate appearance to one outcome. */
export function resolvePA(
  batter: OutcomeVector,
  pitcher: OutcomeVector,
  league: OutcomeVector,
  rng: Rng,
): Outcome {
  return sample(blend(batter, pitcher, league), rng);
}
