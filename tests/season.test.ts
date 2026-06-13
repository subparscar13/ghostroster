import { describe, expect, it } from "vitest";

import { LEAGUE_AVERAGE_OPPONENT, NEUTRAL } from "../src/sim/baseline.ts";
import { playGame } from "../src/sim/game.ts";
import { mulberry32 } from "../src/sim/rng.ts";
import { computeGrade, simulateSeason } from "../src/sim/season.ts";
import type { Hitter, OutcomeVector, Pitcher, Roster } from "../src/sim/types.ts";

const GOD_BAT: OutcomeVector = { bb: 0.2, b1: 0.18, b2: 0.08, b3: 0.01, hr: 0.1, out: 0.43 };
const WEAK_BAT: OutcomeVector = { bb: 0.04, b1: 0.1, b2: 0.02, b3: 0.002, hr: 0.005, out: 0.833 };
const ACE: OutcomeVector = { bb: 0.05, b1: 0.12, b2: 0.03, b3: 0.003, hr: 0.01, out: 0.787 };
const BATTING_PRACTICE: OutcomeVector = { bb: 0.12, b1: 0.2, b2: 0.07, b3: 0.01, hr: 0.06, out: 0.54 };

function hitter(i: number, vector: OutcomeVector): Hitter {
  return { playerId: `h${i}`, name: `Hitter ${i}`, pos: ["DH"], vector };
}
function pitcher(i: number, role: "SP" | "RP", allowed: OutcomeVector): Pitcher {
  return { playerId: `p${i}`, name: `Pitcher ${i}`, role, allowed, stamina: 0.8 };
}
function makeRoster(bat: OutcomeVector, allowed: OutcomeVector): Roster {
  return {
    lineup: Array.from({ length: 9 }, (_, i) => hitter(i, bat)),
    rotation: [pitcher(0, "SP", allowed), pitcher(1, "SP", allowed), pitcher(2, "SP", allowed)],
    bullpen: [pitcher(3, "RP", allowed)],
  };
}

const godRoster = makeRoster(GOD_BAT, ACE);
const weakRoster = makeRoster(WEAK_BAT, BATTING_PRACTICE);

describe("playGame", () => {
  it("produces a decisive result (the loop forbids ties)", () => {
    const g = playGame(godRoster, LEAGUE_AVERAGE_OPPONENT, 0, mulberry32(1), 1);
    expect(g.home.runs).not.toBe(g.away.runs);
    expect(g.win).toBe(g.home.runs > g.away.runs);
  });

  it("box score is internally consistent: Σrbi == Σr == home runs", () => {
    const g = playGame(godRoster, LEAGUE_AVERAGE_OPPONENT, 0, mulberry32(42), 1);
    const rbi = g.batting.reduce((s, b) => s + b.rbi, 0);
    const r = g.batting.reduce((s, b) => s + b.r, 0);
    expect(rbi).toBe(g.home.runs);
    expect(r).toBe(g.home.runs);
  });

  it("line score innings sum to the run totals", () => {
    const g = playGame(godRoster, LEAGUE_AVERAGE_OPPONENT, 0, mulberry32(7), 1);
    expect(g.home.innings.reduce((s, n) => s + n, 0)).toBe(g.home.runs);
    expect(g.away.innings.reduce((s, n) => s + n, 0)).toBe(g.away.runs);
  });

  it("is deterministic for a fixed seed", () => {
    const a = playGame(godRoster, LEAGUE_AVERAGE_OPPONENT, 0, mulberry32(123), 5);
    const b = playGame(godRoster, LEAGUE_AVERAGE_OPPONENT, 0, mulberry32(123), 5);
    expect(a).toEqual(b);
  });
});

describe("simulateSeason", () => {
  it("plays exactly 162 games", () => {
    const res = simulateSeason(godRoster, LEAGUE_AVERAGE_OPPONENT, 2026);
    expect(res.record.w + res.record.l).toBe(162);
    expect(res.gameLogs.length).toBe(162);
  });

  it("is fully reproducible for the same (roster, seed)", () => {
    const a = simulateSeason(godRoster, LEAGUE_AVERAGE_OPPONENT, 2026);
    const b = simulateSeason(godRoster, LEAGUE_AVERAGE_OPPONENT, 2026);
    expect(a.record).toEqual(b.record);
    expect(a.highlights).toEqual(b.highlights);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("a god-tier roster wins far more than a weak one against the same opponent", () => {
    const god = simulateSeason(godRoster, LEAGUE_AVERAGE_OPPONENT, 2026).record.w;
    const weak = simulateSeason(weakRoster, LEAGUE_AVERAGE_OPPONENT, 2026).record.w;
    expect(god).toBeGreaterThan(weak);
  });

  it("highlights are well-formed and the top performer is on the roster", () => {
    const res = simulateSeason(godRoster, LEAGUE_AVERAGE_OPPONENT, 2026);
    expect(res.highlights.longestWinStreak).toBeGreaterThanOrEqual(0);
    expect(res.highlights.longestWinStreak).toBeLessThanOrEqual(162);
    expect(godRoster.lineup.map((h) => h.playerId)).toContain(res.highlights.topPerformer);
  });

  it("rejects malformed rosters", () => {
    const bad: Roster = { lineup: [], rotation: [], bullpen: [] };
    expect(() => simulateSeason(bad, LEAGUE_AVERAGE_OPPONENT, 1)).toThrow();
  });
});

describe("computeGrade", () => {
  it("maps win totals to the documented default scale", () => {
    expect(computeGrade(162)).toBe("A+");
    expect(computeGrade(155)).toBe("A");
    expect(computeGrade(145)).toBe("B");
    expect(computeGrade(60)).toBe("F");
  });
});
