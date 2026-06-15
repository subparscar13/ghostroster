import { describe, expect, it } from "vitest";

import { primaryHighlight, quip, seasonStats, topPerformerName } from "../src/lib/result";
import type { BattingLine, GameLog, Highlights, SeasonResult } from "../src/sim/types";

// Record-only result (empty logs) for quote/highlight selection tests.
const mk = (w: number, l: number, h: Partial<Highlights> = {}): SeasonResult => ({
  record: { w, l },
  gameLogs: [],
  grade: "A",
  highlights: { longestWinStreak: 10, noHitters: 0, bestGame: 1, worstGame: 2, topPerformer: "ruth", ...h },
});

const bl = (h: number, hr: number, pa: number, bb: number): BattingLine => ({ playerId: "x", pa, h, b2: 0, b3: 0, hr, bb, rbi: 0, r: 0 });
const game = (homeRuns: number, awayRuns: number, batting: BattingLine[]): GameLog => ({
  game: 1,
  home: { runs: homeRuns, hits: batting.reduce((s, b) => s + b.h, 0), innings: [] },
  away: { runs: awayRuns, hits: awayRuns === 0 ? 0 : 5, innings: [] },
  batting,
  win: homeRuns > awayRuns,
});
const withLogs = (logs: GameLog[], h: Partial<Highlights> = {}): SeasonResult => {
  const w = logs.filter((g) => g.win).length;
  return { record: { w, l: logs.length - w }, gameLogs: logs, grade: "A", highlights: { longestWinStreak: 5, noHitters: 0, bestGame: 1, worstGame: 2, topPerformer: "x", ...h } };
};

describe("seasonStats", () => {
  it("aggregates runs, HR, shutouts, biggest win, and team average from the logs", () => {
    const s = seasonStats(
      withLogs([
        game(5, 2, [bl(8, 2, 36, 4)]),
        game(10, 0, [bl(12, 3, 40, 5)]), // shutout + biggest win
        game(1, 3, [bl(4, 0, 33, 2)]),
      ]),
    );
    expect(s.runsFor).toBe(16);
    expect(s.runsAgainst).toBe(5);
    expect(s.runDiff).toBe(11);
    expect(s.teamHR).toBe(5);
    expect(s.shutouts).toBe(1);
    expect(s.biggestWin).toBe("10–0");
    expect(s.teamAvg).toBe((24 / 98).toFixed(3)); // 24 H / 98 AB
  });
});

describe("quip", () => {
  it("returns a non-empty quote + (parody) author", () => {
    const q = quip(mk(162, 0), []);
    expect(q.quote.length).toBeGreaterThan(0);
    expect(q.author.length).toBeGreaterThan(0);
  });
  it("is deterministic for the same result", () => {
    expect(quip(mk(120, 42), [])).toEqual(quip(mk(120, 42), []));
  });
  it("weaves the loss count into near-miss lines", () => {
    expect(quip(mk(158, 4), []).quote).toContain("4");
  });
  it("varies across very different seasons", () => {
    expect(quip(mk(162, 0), []).quote).not.toBe(quip(mk(60, 102), []).quote);
  });
  it("resolves the top performer's drafted name", () => {
    const picks = [{ slot: "RF" as const, playerId: "ruth", name: "Babe Ruth", kind: "hitter" as const, tag: "'27 NYY" }];
    expect(topPerformerName(mk(162, 0), picks)).toBe("Babe Ruth");
  });
});

describe("primaryHighlight", () => {
  it("returns a non-empty, deterministic feat", () => {
    const r = mk(150, 12, { noHitters: 2 });
    expect(primaryHighlight(r).length).toBeGreaterThan(0);
    expect(primaryHighlight(r)).toBe(primaryHighlight(r));
  });
});
