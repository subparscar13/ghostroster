/**
 * Game assembly (T034) + box-score bookkeeping (T035).
 *
 * One game = my roster (home) vs the opponent model (away). My hitters face the
 * opponent's pitching every inning; the opponent's league-average hitters face my
 * starter for innings 1–6 and my reliever for 7+ (the v1 usage rule, no fatigue —
 * flagged lever). The league baseline for every blend is NEUTRAL.
 *
 * Simplifications (deliberately dumb, flagged like the advancement table): both
 * sides always bat a full 9 (no skip-bottom-9-when-leading, no walk-off), and
 * extra innings are full innings until someone leads after a complete inning. This
 * keeps innings symmetric between the two sides and the result fully deterministic;
 * the slight offensive inflation is absorbed by M2 run-environment tuning (SC-004).
 */

import { applyOutcome, newInning } from "./baseout.ts";
import { NEUTRAL } from "./baseline.ts";
import { resolvePA } from "./resolve.ts";
import type { Rng } from "./rng.ts";
import type { BattingLine, GameLog, OpponentModel, OutcomeVector, Roster } from "./types.ts";

function emptyLine(playerId: string): BattingLine {
  return { playerId, pa: 0, h: 0, b2: 0, b3: 0, hr: 0, bb: 0, rbi: 0, r: 0 };
}

/**
 * Play one half-inning to 3 outs. `vectorFor(slot)` returns the batter's vector for
 * a lineup slot (0–8); the batting order persists across innings via `startIndex`.
 * When `box` is supplied (my team), it accumulates per-slot batting lines: the
 * batter gets the PA/hit/RBI, and every runner that scores is credited a run by id
 * (the runner id is the lineup slot — unique among baserunners within an inning).
 */
function halfInning(
  vectorFor: (slot: number) => OutcomeVector,
  startIndex: number,
  pitcher: OutcomeVector,
  rng: Rng,
  box: BattingLine[] | null,
): { runs: number; hits: number; nextIndex: number } {
  let state = newInning();
  let index = startIndex;
  let runs = 0;
  let hits = 0;
  while (state.outs < 3) {
    const slot = index % 9;
    const outcome = resolvePA(vectorFor(slot), pitcher, NEUTRAL, rng);
    const { state: nextState, scored } = applyOutcome(state, outcome, slot, rng);
    state = nextState;
    runs += scored.length;
    const isHit = outcome === "b1" || outcome === "b2" || outcome === "b3" || outcome === "hr";
    if (isHit) hits++;
    if (box) {
      const line = box[slot]!;
      line.pa++;
      if (isHit) line.h++;
      if (outcome === "b2") line.b2++;
      else if (outcome === "b3") line.b3++;
      else if (outcome === "hr") line.hr++;
      else if (outcome === "bb") line.bb++;
      line.rbi += scored.length;
      for (const s of scored) box[s]!.r++;
    }
    index++;
  }
  return { runs, hits, nextIndex: index };
}

/**
 * Simulate one game. `starterIndex` selects the day's starter from the rotation;
 * `gameNumber` is stamped into the returned log. Pure given `rng`.
 */
export function playGame(
  roster: Roster,
  opponent: OpponentModel,
  starterIndex: number,
  rng: Rng,
  gameNumber: number,
): GameLog {
  const sp = roster.rotation[starterIndex % roster.rotation.length]!;
  const rp = roster.bullpen[0]!;
  const lineup = roster.lineup;
  const box = lineup.map((h) => emptyLine(h.playerId));

  const myInnings: number[] = [];
  const oppInnings: number[] = [];
  let myRuns = 0;
  let myHits = 0;
  let oppRuns = 0;
  let oppHits = 0;
  let myIndex = 0;
  let oppIndex = 0;

  let inning = 0;
  do {
    inning++;
    // Top half: opponent (league-average hitters) bats vs my pitching.
    const myPitcher = inning <= 6 ? sp.allowed : rp.allowed;
    const top = halfInning(() => opponent.batter, oppIndex, myPitcher, rng, null);
    oppRuns += top.runs;
    oppHits += top.hits;
    oppIndex = top.nextIndex;
    oppInnings.push(top.runs);

    // Bottom half: my lineup bats vs the opponent's pitching.
    const bottom = halfInning((slot) => lineup[slot]!.vector, myIndex, opponent.pitcher, rng, box);
    myRuns += bottom.runs;
    myHits += bottom.hits;
    myIndex = bottom.nextIndex;
    myInnings.push(bottom.runs);
  } while (inning < 9 || myRuns === oppRuns);

  return {
    game: gameNumber,
    home: { runs: myRuns, hits: myHits, innings: myInnings },
    away: { runs: oppRuns, hits: oppHits, innings: oppInnings },
    batting: box,
    win: myRuns > oppRuns,
  };
}
