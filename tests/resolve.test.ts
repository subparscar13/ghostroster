import { describe, expect, it } from "vitest";

import { NEUTRAL } from "../src/sim/baseline";
import { blend, resolvePA, sample } from "../src/sim/resolve";
import { mulberry32 } from "../src/sim/rng";
import type { OutcomeVector } from "../src/sim/types";
import { OUTCOMES } from "../src/sim/types";

const RUTH: OutcomeVector = { bb: 0.2, b1: 0.1, b2: 0.06, b3: 0.01, hr: 0.13, out: 0.5 };

const sumVec = (v: OutcomeVector) => OUTCOMES.reduce((s, o) => s + v[o], 0);

describe("blend (log5 / odds-ratio)", () => {
  it("normalizes to 1", () => {
    expect(sumVec(blend(RUTH, NEUTRAL))).toBeCloseTo(1, 10);
  });

  it("reduces to the batter's vector vs the league-average pitcher", () => {
    const b = blend(RUTH, NEUTRAL, NEUTRAL);
    for (const o of OUTCOMES) expect(b[o]).toBeCloseTo(RUTH[o], 10);
  });

  it("reduces to the pitcher's vector for the league-average batter", () => {
    const ace: OutcomeVector = { bb: 0.06, b1: 0.13, b2: 0.04, b3: 0.004, hr: 0.016, out: 0.75 };
    const b = blend(NEUTRAL, ace, NEUTRAL);
    for (const o of OUTCOMES) expect(b[o]).toBeCloseTo(ace[o], 10);
  });

  it("is symmetric in batter/pitcher", () => {
    const p: OutcomeVector = { bb: 0.07, b1: 0.14, b2: 0.05, b3: 0.006, hr: 0.02, out: 0.714 };
    const ab = blend(RUTH, p);
    const ba = blend(p, RUTH);
    for (const o of OUTCOMES) expect(ab[o]).toBeCloseTo(ba[o], 12);
  });

  it("a HR-suppressing pitcher pulls the slugger's HR rate down", () => {
    const lowHr: OutcomeVector = { bb: 0.085, b1: 0.155, b2: 0.045, b3: 0.005, hr: 0.01, out: 0.7 };
    expect(blend(RUTH, lowHr).hr).toBeLessThan(RUTH.hr);
  });

  it("falls back to the league baseline on degenerate (all-zero) input", () => {
    const zero = { bb: 0, b1: 0, b2: 0, b3: 0, hr: 0, out: 0 } as OutcomeVector;
    expect(blend(zero, zero)).toEqual(NEUTRAL);
  });
});

describe("sample", () => {
  it("returns the first outcome for a draw of 0", () => {
    expect(sample(RUTH, () => 0)).toBe("bb");
  });

  it("returns 'out' for a draw at the top of the range", () => {
    expect(sample(RUTH, () => 0.9999999)).toBe("out");
  });

  it("empirical frequencies match the vector over many seeded draws", () => {
    const rng = mulberry32(99);
    const n = 300_000;
    const counts: Record<string, number> = { bb: 0, b1: 0, b2: 0, b3: 0, hr: 0, out: 0 };
    for (let i = 0; i < n; i++) {
      const o = sample(RUTH, rng);
      counts[o] = (counts[o] ?? 0) + 1;
    }
    for (const o of OUTCOMES) expect((counts[o] ?? 0) / n).toBeCloseTo(RUTH[o], 2);
  });
});

describe("resolvePA", () => {
  it("is deterministic for a fixed seed", () => {
    const seq = (seed: number) => {
      const rng = mulberry32(seed);
      return Array.from({ length: 50 }, () => resolvePA(RUTH, NEUTRAL, NEUTRAL, rng));
    };
    expect(seq(7)).toEqual(seq(7));
  });
});
