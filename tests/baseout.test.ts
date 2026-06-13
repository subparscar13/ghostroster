import { describe, expect, it } from "vitest";

import { applyOutcome, newInning, playHalfInning } from "../src/sim/baseout.ts";
import { mulberry32 } from "../src/sim/rng.ts";
import type { Bases, BaseOutState } from "../src/sim/baseout.ts";
import type { Outcome } from "../src/sim/types.ts";

const bases = (first: boolean, second: boolean, third: boolean): Bases => ({ first, second, third });
const state = (b: Bases, outs = 0): BaseOutState => ({ bases: b, outs });
const loaded = bases(true, true, true);
const never = () => 0; // rng stub; 0 < 0.5 → single sends the runner from 2nd home

describe("applyOutcome", () => {
  it("OUT records an out and leaves runners", () => {
    const r = applyOutcome(state(loaded, 1), "out", never);
    expect(r.runs).toBe(0);
    expect(r.state.outs).toBe(2);
    expect(r.state.bases).toEqual(loaded);
  });

  it("HR clears the bases and scores everyone plus the batter", () => {
    const r = applyOutcome(state(loaded), "hr", never);
    expect(r.runs).toBe(4);
    expect(r.state.bases).toEqual(bases(false, false, false));
  });

  it("triple scores all runners and leaves the batter on 3rd", () => {
    const r = applyOutcome(state(loaded), "b3", never);
    expect(r.runs).toBe(3);
    expect(r.state.bases).toEqual(bases(false, false, true));
  });

  it("double scores runners from 2nd/3rd and sends 1st to 3rd", () => {
    const r = applyOutcome(state(loaded), "b2", never);
    expect(r.runs).toBe(2); // from 2nd and 3rd
    expect(r.state.bases).toEqual(bases(false, true, true)); // batter→2nd, 1st→3rd
  });

  describe("single", () => {
    it("scores the runner from 3rd and sends the runner from 2nd home when rng < 0.5", () => {
      const r = applyOutcome(state(bases(false, true, true)), "b1", () => 0.4);
      expect(r.runs).toBe(2); // 3rd scores, 2nd scores
      expect(r.state.bases).toEqual(bases(true, false, false));
    });

    it("holds the runner from 2nd at 3rd when rng >= 0.5", () => {
      const r = applyOutcome(state(bases(false, true, false)), "b1", () => 0.9);
      expect(r.runs).toBe(0);
      expect(r.state.bases).toEqual(bases(true, false, true)); // batter→1st, 2nd→3rd
    });

    it("advances the runner from 1st to 2nd", () => {
      const r = applyOutcome(state(bases(true, false, false)), "b1", never);
      expect(r.runs).toBe(0);
      expect(r.state.bases).toEqual(bases(true, true, false));
    });
  });

  describe("walk (force only)", () => {
    it("bases loaded forces in a run and stays loaded", () => {
      const r = applyOutcome(state(loaded), "bb", never);
      expect(r.runs).toBe(1);
      expect(r.state.bases).toEqual(loaded);
    });

    it("runners on the corners do not score — bases load, no run", () => {
      const r = applyOutcome(state(bases(true, false, true)), "bb", never);
      expect(r.runs).toBe(0);
      expect(r.state.bases).toEqual(loaded);
    });

    it("empty bases just puts the batter on first", () => {
      const r = applyOutcome(state(bases(false, false, false)), "bb", never);
      expect(r.runs).toBe(0);
      expect(r.state.bases).toEqual(bases(true, false, false));
    });
  });
});

describe("playHalfInning", () => {
  it("ends at exactly 3 outs with no scoring on an all-out inning", () => {
    const runs = playHalfInning(() => "out", never);
    expect(runs).toBe(0);
  });

  it("scores a run when hits precede the three outs", () => {
    const script: Outcome[] = ["hr", "out", "out", "out"];
    let i = 0;
    const runs = playHalfInning(() => script[i++]!, never);
    expect(runs).toBe(1);
  });

  it("is deterministic for a fixed seed (the single's 50% send is the only RNG use)", () => {
    // A finite script forces the three outs; the RNG only decides the runner-from-2nd
    // send on each single, so the same seed must reproduce the same run total.
    const scripted = (seed: number) => {
      const rng = mulberry32(seed);
      const script: Outcome[] = ["b1", "b1", "out", "b2", "out", "b1", "out"];
      let i = 0;
      return playHalfInning(() => script[i++]!, () => rng());
    };
    expect(scripted(5)).toBe(scripted(5));
  });
});
