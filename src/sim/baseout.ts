/**
 * Base-out state machine (T033). 24 states = 3 base configurations (each of 1st /
 * 2nd / 3rd occupied or not → 8) × {0, 1, 2} outs. The advancement table is
 * deliberately dumb and fully documented (data-model.md); it is tuned ONLY if M2
 * run-environment validation fails (SC-004). No double plays or sacrifice flies in
 * v1, and the lone stochastic element is the single's "runner on 2nd scores 50%".
 *
 * Each base carries a **runner id** (not just occupancy) so the game layer can
 * credit runs scored to individual batters for box-score `r` (T035). The id is
 * opaque to this module — callers use the batter's lineup slot.
 */

import type { Rng } from "./rng.ts";
import type { Outcome } from "./types.ts";

/** Identifier for a baserunner — opaque here; the game layer uses the lineup slot. */
export type Runner = number;

/** Occupied bases. `null` = empty; otherwise the id of the runner standing there. */
export type Bases = { first: Runner | null; second: Runner | null; third: Runner | null };

const EMPTY_BASES: Bases = { first: null, second: null, third: null };

export type BaseOutState = { bases: Bases; outs: number };

/** A fresh half-inning: empty bases, no outs. */
export function newInning(): BaseOutState {
  return { bases: { ...EMPTY_BASES }, outs: 0 };
}

/**
 * Apply one resolved outcome to the base-out state. Pure: the only randomness is
 * the single's 50% send of the runner from 2nd, drawn from `rng` (and only then).
 * Returns the next state plus the ids of any runners who scored (the batter is
 * included on a home run). `scored.length` is the runs on the play.
 */
export function applyOutcome(
  state: BaseOutState,
  outcome: Outcome,
  batter: Runner,
  rng: Rng,
): { state: BaseOutState; scored: Runner[] } {
  const { first, second, third } = state.bases;
  const scored: Runner[] = [];
  let next: Bases;

  switch (outcome) {
    case "out":
      return { state: { bases: state.bases, outs: state.outs + 1 }, scored };

    case "bb": {
      // Force-advance only: a runner moves only if the base behind is forced.
      let s = second;
      let t = third;
      if (first !== null) {
        if (second !== null) {
          if (third !== null) scored.push(third); // bases loaded → 3rd forced home
          t = second; // 2nd forced to 3rd
        }
        s = first; // 1st forced to 2nd
      }
      next = { first: batter, second: s, third: t };
      break;
    }

    case "b1": {
      // batter→1B; runner on 3rd scores; runner on 2nd scores 50% else →3rd;
      // runner on 1st →2nd.
      if (third !== null) scored.push(third);
      let t: Runner | null = null;
      if (second !== null) {
        if (rng() < 0.5) scored.push(second);
        else t = second;
      }
      next = { first: batter, second: first, third: t };
      break;
    }

    case "b2": {
      // batter→2B; all runners +2 bases (2nd and 3rd score, 1st→3rd).
      if (third !== null) scored.push(third);
      if (second !== null) scored.push(second);
      next = { first: null, second: batter, third: first };
      break;
    }

    case "b3": {
      // batter→3B; all runners score.
      if (first !== null) scored.push(first);
      if (second !== null) scored.push(second);
      if (third !== null) scored.push(third);
      next = { first: null, second: null, third: batter };
      break;
    }

    case "hr": {
      // batter + all runners score.
      if (first !== null) scored.push(first);
      if (second !== null) scored.push(second);
      if (third !== null) scored.push(third);
      scored.push(batter);
      next = { ...EMPTY_BASES };
      break;
    }
  }

  return { state: { bases: next, outs: state.outs }, scored };
}

/**
 * Play a half-inning to 3 outs, returning the runs scored. `next` supplies the
 * resolved outcome and batter id for each plate appearance (the caller threads
 * lineup + pitcher); `rng` drives the single's 50% send. Decoupled from lineup
 * logic, which lands in T034's game assembly.
 */
export function playHalfInning(next: () => { outcome: Outcome; batter: Runner }, rng: Rng): number {
  let state = newInning();
  let runs = 0;
  while (state.outs < 3) {
    const { outcome, batter } = next();
    const res = applyOutcome(state, outcome, batter, rng);
    state = res.state;
    runs += res.scored.length;
  }
  return runs;
}
