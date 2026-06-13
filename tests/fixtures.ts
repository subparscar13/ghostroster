/**
 * Shared, stable test fixtures for the sim's golden-master (T036) and performance
 * (T037) checks. Kept in one module so both use byte-identical inputs — if these
 * change, the golden master must be re-pinned deliberately.
 */

import { hashSeed } from "../src/sim/rng.ts";
import type { Hitter, OutcomeVector, Pitcher, Roster, SeasonResult } from "../src/sim/types.ts";

/** Build an outcome vector from its non-out components; `out` absorbs the rest. */
function vec(bb: number, b1: number, b2: number, b3: number, hr: number): OutcomeVector {
  return { bb, b1, b2, b3, hr, out: 1 - (bb + b1 + b2 + b3 + hr) };
}

// Nine hitters with a deliberate spread from sluggers to weak bats.
const HITTER_VECTORS: OutcomeVector[] = [
  vec(0.14, 0.17, 0.06, 0.01, 0.07),
  vec(0.11, 0.19, 0.07, 0.02, 0.05),
  vec(0.18, 0.15, 0.05, 0.01, 0.09),
  vec(0.09, 0.2, 0.04, 0.01, 0.03),
  vec(0.1, 0.16, 0.06, 0.02, 0.06),
  vec(0.08, 0.18, 0.05, 0.01, 0.02),
  vec(0.07, 0.15, 0.04, 0.01, 0.03),
  vec(0.06, 0.14, 0.03, 0.005, 0.02),
  vec(0.05, 0.12, 0.03, 0.005, 0.01),
];

const PITCHER_VECTORS: OutcomeVector[] = [
  vec(0.06, 0.13, 0.04, 0.004, 0.015), // SP1
  vec(0.07, 0.14, 0.045, 0.005, 0.02), // SP2
  vec(0.08, 0.15, 0.05, 0.006, 0.025), // SP3
  vec(0.07, 0.13, 0.04, 0.004, 0.018), // RP
];

function hitter(i: number): Hitter {
  return { playerId: `h${i}`, name: `Hitter ${i}`, pos: ["DH"], vector: HITTER_VECTORS[i]! };
}
function pitcher(i: number, role: "SP" | "RP"): Pitcher {
  return { playerId: `p${i}`, name: `Pitcher ${i}`, role, allowed: PITCHER_VECTORS[i]!, stamina: 0.75 };
}

export const FIXED_ROSTER: Roster = {
  lineup: Array.from({ length: 9 }, (_, i) => hitter(i)),
  rotation: [pitcher(0, "SP"), pitcher(1, "SP"), pitcher(2, "SP")],
  bullpen: [pitcher(3, "RP")],
};

export const FIXED_SEED = 20260612;

/**
 * A compact, stable digest of a season's line scores + record (FNV-1a via
 * hashSeed). Any drift in the sim — RNG, blend, advancement table, usage rule —
 * moves this number, so the golden test pins it.
 */
export function seasonDigest(result: SeasonResult): number {
  let s = `${result.record.w}-${result.record.l}`;
  for (const g of result.gameLogs) {
    s += `|${g.home.runs},${g.away.runs},${g.home.hits},${g.away.hits},${g.win ? 1 : 0}`;
  }
  return hashSeed(s);
}
