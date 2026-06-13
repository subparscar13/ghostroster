import { describe, expect, it } from "vitest";

import { LEAGUE_AVERAGE_OPPONENT } from "../src/sim/baseline";
import { simulateSeason } from "../src/sim/season";
import { FIXED_ROSTER, FIXED_SEED, seasonDigest } from "./fixtures";

/**
 * Golden master (T036). The fixed roster + seed must always produce this exact
 * record, digest, and highlights. A diff means the sim changed — RNG, blend,
 * advancement table, usage rule, or box-score logic. Never edit these to match new
 * output; investigate the drift first, then re-pin deliberately.
 *
 * Cross-browser reproduction (SC-003) rides on two facts: the mulberry32 stream is
 * pinned exactly in rng.test.ts, and the sim uses only that stream + integer/float
 * arithmetic that ECMAScript fully specifies — so this digest is engine-independent.
 */
describe("golden master", () => {
  const result = simulateSeason(FIXED_ROSTER, LEAGUE_AVERAGE_OPPONENT, FIXED_SEED);

  it("reproduces the pinned record exactly", () => {
    expect(result.record).toEqual({ w: 127, l: 35 });
  });

  it("reproduces the pinned season digest", () => {
    expect(seasonDigest(result)).toBe(3142536333);
  });

  it("reproduces the pinned highlights", () => {
    expect(result.highlights).toEqual({
      longestWinStreak: 17,
      noHitters: 2,
      bestGame: 86,
      worstGame: 2,
      topPerformer: "h2",
    });
  });

  it("is stable across repeated runs (same digest)", () => {
    const again = simulateSeason(FIXED_ROSTER, LEAGUE_AVERAGE_OPPONENT, FIXED_SEED);
    expect(seasonDigest(again)).toBe(3142536333);
  });
});
