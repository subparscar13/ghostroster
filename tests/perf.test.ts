import { describe, expect, it } from "vitest";

import { LEAGUE_AVERAGE_OPPONENT } from "../src/sim/baseline.ts";
import { simulateSeason } from "../src/sim/season.ts";
import { FIXED_ROSTER } from "./fixtures.ts";

/**
 * Performance gate (T037, constitution): a full 162-game season must run in < 2s on
 * a mid-range phone. Dev machines run it in ~3 ms; we assert a 50 ms/season ceiling
 * — that catches any order-of-magnitude regression while leaving comfortable
 * headroom for a phone (typically 5–15× slower) to stay well under the 2s budget.
 */
describe("performance", () => {
  it("simulates a 162-game season far inside the <2s budget", () => {
    for (let i = 0; i < 3; i++) simulateSeason(FIXED_ROSTER, LEAGUE_AVERAGE_OPPONENT, i); // warm up JIT

    const n = 10;
    const start = performance.now();
    for (let i = 0; i < n; i++) simulateSeason(FIXED_ROSTER, LEAGUE_AVERAGE_OPPONENT, 100 + i);
    const msPerSeason = (performance.now() - start) / n;

    expect(msPerSeason).toBeLessThan(50);
  });
});
