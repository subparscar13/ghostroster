/**
 * Base-out state machine (T033). 24 states = 3 base configurations (each of 1st /
 * 2nd / 3rd occupied or not → 8) × {0, 1, 2} outs. The advancement table is
 * deliberately dumb and fully documented (data-model.md); it is tuned ONLY if M2
 * run-environment validation fails (SC-004). No double plays or sacrifice flies in
 * v1, and the lone stochastic element is the single's "runner on 2nd scores 50%".
 */

import { resolvePA } from "./resolve.ts";
import type { Rng } from "./rng.ts";
import type { Outcome, OutcomeVector } from "./types.ts";

/** Occupied bases. `true` = a runner stands on that base. */
export type Bases = { first: boolean; second: boolean; third: boolean };

const EMPTY_BASES: Bases = { first: false, second: false, third: false };

export type BaseOutState = { bases: Bases; outs: number };

/** A fresh half-inning: empty bases, no outs. */
export function newInning(): BaseOutState {
  return { bases: { ...EMPTY_BASES }, outs: 0 };
}

/**
 * Apply one resolved outcome to the base-out state. Pure: the only randomness is
 * the single's 50% send of the runner from 2nd, drawn from `rng` (and only then).
 * Returns the next state plus the number of runs that scored on the play.
 */
export function applyOutcome(state: BaseOutState, outcome: Outcome, rng: Rng): { state: BaseOutState; runs: number } {
  const { first, second, third } = state.bases;
  let runs = 0;
  let next: Bases;

  switch (outcome) {
    case "out":
      return { state: { bases: state.bases, outs: state.outs + 1 }, runs: 0 };

    case "bb": {
      // Force-advance only: a runner moves only if the base behind is forced.
      let s = second;
      let t = third;
      if (first) {
        if (second) {
          if (third) runs++; // bases loaded → runner on 3rd forced home
          t = true; // 2nd forced to 3rd
        }
        s = true; // 1st forced to 2nd
      }
      next = { first: true, second: s, third: t };
      break;
    }

    case "b1": {
      // batter→1B; runner on 3rd scores; runner on 2nd scores 50% else →3rd;
      // runner on 1st →2nd.
      if (third) runs++;
      let t = false;
      if (second) {
        if (rng() < 0.5) runs++;
        else t = true;
      }
      next = { first: true, second: first, third: t };
      break;
    }

    case "b2": {
      // batter→2B; all runners +2 bases (2nd and 3rd score, 1st→3rd).
      if (third) runs++;
      if (second) runs++;
      next = { first: false, second: true, third: first };
      break;
    }

    case "b3": {
      // batter→3B; all runners score.
      runs += (first ? 1 : 0) + (second ? 1 : 0) + (third ? 1 : 0);
      next = { first: false, second: false, third: true };
      break;
    }

    case "hr": {
      // batter + all runners score.
      runs += 1 + (first ? 1 : 0) + (second ? 1 : 0) + (third ? 1 : 0);
      next = { ...EMPTY_BASES };
      break;
    }
  }

  return { state: { bases: next, outs: state.outs }, runs };
}

/**
 * Play a half-inning to 3 outs, returning the runs scored. `nextOutcome` supplies
 * the resolved outcome for each plate appearance (the caller threads lineup +
 * pitcher); `rng` drives the single's 50% send. Decoupled from lineup logic, which
 * lands in T034's game assembly.
 */
export function playHalfInning(nextOutcome: () => Outcome, rng: Rng): number {
  let state = newInning();
  let runs = 0;
  while (state.outs < 3) {
    const res = applyOutcome(state, nextOutcome(), rng);
    state = res.state;
    runs += res.runs;
  }
  return runs;
}

/** Convenience: resolve one PA (batter vs pitcher vs league) and apply it. */
export function stepPA(
  state: BaseOutState,
  batter: OutcomeVector,
  pitcher: OutcomeVector,
  league: OutcomeVector,
  rng: Rng,
): { state: BaseOutState; runs: number; outcome: Outcome } {
  const outcome = resolvePA(batter, pitcher, league, rng);
  const { state: nextState, runs } = applyOutcome(state, outcome, rng);
  return { state: nextState, runs, outcome };
}
