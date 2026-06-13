import { describe, expect, it } from "vitest";

import { applyOutcome, newInning, playHalfInning } from "../src/sim/baseout";
import { mulberry32 } from "../src/sim/rng";
import type { Bases, BaseOutState, Runner } from "../src/sim/baseout";
import type { Outcome } from "../src/sim/types";

// Distinct ids so a test can tell *which* runner scored / advanced.
const R1 = 10;
const R2 = 11;
const R3 = 12;
const BAT = 99; // the batter putting the ball in play

const bases = (first: Runner | null, second: Runner | null, third: Runner | null): Bases => ({ first, second, third });
const state = (b: Bases, outs = 0): BaseOutState => ({ bases: b, outs });
const loaded = bases(R1, R2, R3);
const empty = bases(null, null, null);
const send = () => 0.4; // rng < 0.5 → the single sends the runner from 2nd home
const hold = () => 0.9; // rng >= 0.5 → the runner from 2nd holds at 3rd

describe("applyOutcome", () => {
  it("OUT records an out and leaves runners", () => {
    const r = applyOutcome(state(loaded, 1), "out", BAT, send);
    expect(r.scored).toEqual([]);
    expect(r.state.outs).toBe(2);
    expect(r.state.bases).toEqual(loaded);
  });

  it("HR clears the bases and scores every runner plus the batter", () => {
    const r = applyOutcome(state(loaded), "hr", BAT, send);
    expect(r.scored).toEqual([R1, R2, R3, BAT]);
    expect(r.state.bases).toEqual(empty);
  });

  it("triple scores all runners and leaves the batter on 3rd", () => {
    const r = applyOutcome(state(loaded), "b3", BAT, send);
    expect(r.scored).toEqual([R1, R2, R3]);
    expect(r.state.bases).toEqual(bases(null, null, BAT));
  });

  it("double scores runners from 2nd/3rd, sends 1st to 3rd, batter to 2nd", () => {
    const r = applyOutcome(state(loaded), "b2", BAT, send);
    expect(r.scored).toEqual([R3, R2]);
    expect(r.state.bases).toEqual(bases(null, BAT, R1));
  });

  describe("single", () => {
    it("scores 3rd and sends the runner from 2nd home when rng < 0.5", () => {
      const r = applyOutcome(state(bases(null, R2, R3)), "b1", BAT, send);
      expect(r.scored).toEqual([R3, R2]);
      expect(r.state.bases).toEqual(bases(BAT, null, null));
    });

    it("holds the runner from 2nd at 3rd when rng >= 0.5", () => {
      const r = applyOutcome(state(bases(null, R2, null)), "b1", BAT, hold);
      expect(r.scored).toEqual([]);
      expect(r.state.bases).toEqual(bases(BAT, null, R2)); // batter→1st, 2nd→3rd
    });

    it("advances the runner from 1st to 2nd", () => {
      const r = applyOutcome(state(bases(R1, null, null)), "b1", BAT, send);
      expect(r.scored).toEqual([]);
      expect(r.state.bases).toEqual(bases(BAT, R1, null));
    });
  });

  describe("walk (force only)", () => {
    it("bases loaded forces in the runner from 3rd and stays loaded", () => {
      const r = applyOutcome(state(loaded), "bb", BAT, send);
      expect(r.scored).toEqual([R3]);
      expect(r.state.bases).toEqual(bases(BAT, R1, R2));
    });

    it("runners on the corners do not score — bases load, no run", () => {
      const r = applyOutcome(state(bases(R1, null, R3)), "bb", BAT, send);
      expect(r.scored).toEqual([]);
      expect(r.state.bases).toEqual(bases(BAT, R1, R3)); // 3rd not forced
    });

    it("empty bases just puts the batter on first", () => {
      const r = applyOutcome(state(empty), "bb", BAT, send);
      expect(r.scored).toEqual([]);
      expect(r.state.bases).toEqual(bases(BAT, null, null));
    });
  });
});

describe("playHalfInning", () => {
  it("ends at exactly 3 outs with no scoring on an all-out inning", () => {
    expect(playHalfInning(() => ({ outcome: "out", batter: 0 }), send)).toBe(0);
  });

  it("scores a run when hits precede the three outs", () => {
    const script: Outcome[] = ["hr", "out", "out", "out"];
    let i = 0;
    const runs = playHalfInning(() => ({ outcome: script[i++]!, batter: i }), send);
    expect(runs).toBe(1);
  });

  it("is deterministic for a fixed seed (the single's 50% send is the only RNG use)", () => {
    const scripted = (seed: number) => {
      const rng = mulberry32(seed);
      const script: Outcome[] = ["b1", "b1", "out", "b2", "out", "b1", "out"];
      let i = 0;
      return playHalfInning(() => ({ outcome: script[i]!, batter: i++ }), () => rng());
    };
    expect(scripted(5)).toBe(scripted(5));
  });
});
