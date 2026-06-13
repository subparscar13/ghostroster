/**
 * Season assembly (T034) + highlights/grade (T035) + the public sim entry point.
 *
 * `simulateSeason(roster, opponent, seed)` is THE sim — pure, seeded, side-effect
 * free (constitution II): no I/O, no globals, no wall-clock, no Math.random. The
 * single mulberry32 stream seeded from `seed` drives all 162 games, so the same
 * inputs reproduce an identical result on every engine.
 */

import { playGame } from "./game";
import { mulberry32 } from "./rng";
import type { GameLog, Highlights, OpponentModel, Roster, SeasonResult } from "./types";

export const GAMES = 162;

function assertRoster(roster: Roster): void {
  if (roster.lineup.length !== 9) throw new Error(`roster.lineup must have 9 hitters, got ${roster.lineup.length}`);
  if (roster.rotation.length !== 3) throw new Error(`roster.rotation must have 3 starters, got ${roster.rotation.length}`);
  if (roster.bullpen.length !== 1) throw new Error(`roster.bullpen must have 1 reliever, got ${roster.bullpen.length}`);
}

/**
 * Letter grade from the win total. A deliberately simple default scale — the grade
 * design is a flagged tuning item and the LAST thing cut under budget pressure
 * (constitution VI). Calibrate alongside SC-004 in M2 tuning.
 */
export function computeGrade(wins: number): string {
  if (wins >= GAMES) return "A+";
  if (wins >= 150) return "A";
  if (wins >= 140) return "B";
  if (wins >= 120) return "C";
  if (wins >= 100) return "D";
  return "F";
}

export function computeHighlights(gameLogs: GameLog[]): Highlights {
  let longestWinStreak = 0;
  let streak = 0;
  let noHitters = 0;
  let bestGame = 0;
  let worstGame = 0;
  let bestDiff = -Infinity;
  let worstDiff = Infinity;

  // Season batting totals per player, to crown a top performer.
  const hr = new Map<string, number>();
  const hits = new Map<string, number>();

  for (const g of gameLogs) {
    if (g.win) {
      streak++;
      if (streak > longestWinStreak) longestWinStreak = streak;
    } else {
      streak = 0;
    }
    // A no-hitter = my pitching held the opponent (away) hitless.
    if (g.away.hits === 0) noHitters++;

    const diff = g.home.runs - g.away.runs;
    if (diff > bestDiff) {
      bestDiff = diff;
      bestGame = g.game;
    }
    if (diff < worstDiff) {
      worstDiff = diff;
      worstGame = g.game;
    }

    for (const line of g.batting) {
      hr.set(line.playerId, (hr.get(line.playerId) ?? 0) + line.hr);
      hits.set(line.playerId, (hits.get(line.playerId) ?? 0) + line.h);
    }
  }

  // Top performer: most HR, tie-broken by hits, then playerId for determinism.
  let topPerformer = "";
  let topHr = -1;
  let topHits = -1;
  for (const playerId of [...hr.keys()].sort()) {
    const h = hr.get(playerId) ?? 0;
    const hh = hits.get(playerId) ?? 0;
    if (h > topHr || (h === topHr && hh > topHits)) {
      topHr = h;
      topHits = hh;
      topPerformer = playerId;
    }
  }

  return { longestWinStreak, noHitters, bestGame, worstGame, topPerformer };
}

/**
 * Simulate a full 162-game season. Pure and deterministic in `(roster, opponent,
 * seed)`. The rotation cycles SP1→SP2→SP3 across the schedule.
 */
export function simulateSeason(roster: Roster, opponent: OpponentModel, seed: number): SeasonResult {
  assertRoster(roster);
  const rng = mulberry32(seed);
  const gameLogs: GameLog[] = [];
  let w = 0;
  let l = 0;

  for (let game = 1; game <= GAMES; game++) {
    const starterIndex = (game - 1) % roster.rotation.length;
    const log = playGame(roster, opponent, starterIndex, rng, game);
    gameLogs.push(log);
    if (log.win) w++;
    else l++;
  }

  return {
    record: { w, l },
    gameLogs,
    highlights: computeHighlights(gameLogs),
    grade: computeGrade(w),
  };
}
