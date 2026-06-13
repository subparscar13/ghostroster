import { describe, expect, it } from "vitest";

import { hashSeed, mulberry32 } from "../src/sim/rng.ts";

/**
 * Golden-master sequences for mulberry32 (T031). These are the canonical outputs of
 * the reference algorithm; pinned with EXACT equality because constitution II
 * requires the stream to reproduce bit-for-bit across browsers/engines. A diff here
 * means the RNG (and therefore every seeded season) changed — never "adjust" these
 * to match new output; investigate why the stream moved.
 */
const GOLDEN: Record<number, number[]> = {
  0: [
    0.26642920868471265, 0.0003297457005828619, 0.2232720274478197,
    0.1462021479383111, 0.46732782293111086,
  ],
  42: [
    0.6011037519201636, 0.44829055899754167, 0.8524657934904099,
    0.6697340414393693, 0.17481389874592423,
  ],
  12345: [
    0.9797282677609473, 0.3067522644996643, 0.484205421525985, 0.817934412509203,
    0.5094283693470061,
  ],
};

describe("mulberry32", () => {
  it.each(Object.entries(GOLDEN))("seed %s reproduces the pinned sequence exactly", (seed, expected) => {
    const r = mulberry32(Number(seed));
    const got = Array.from({ length: expected.length }, () => r());
    expect(got).toEqual(expected);
  });

  it("is deterministic: two generators from one seed yield identical streams", () => {
    const a = mulberry32(2026);
    const b = mulberry32(2026);
    const seqA = Array.from({ length: 1000 }, () => a());
    const seqB = Array.from({ length: 1000 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("emits floats in [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 10000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("different seeds diverge", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});

describe("hashSeed", () => {
  it("is a stable uint32 (pinned daily-seed value)", () => {
    const h = hashSeed("ghostroster-2026-06-12");
    expect(h).toBe(2072827383);
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it("is collision-sensitive to small input changes", () => {
    expect(hashSeed("2026-06-12")).not.toBe(hashSeed("2026-06-13"));
  });
});
