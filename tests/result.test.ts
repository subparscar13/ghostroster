import { describe, expect, it } from "vitest";

import { playerSeasonStats, primaryHighlight, quip, seasonStats, topPerformerName } from "../src/lib/result";
import type { DraftPick } from "../src/lib/types";
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
  pitching: { spIp: 8, spR: awayRuns, rpIp: 1, rpR: 0 },
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
    expect(s.worstLoss).toBe("1–3");
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
  it("attributes to a diverse set of voices, no single author dominating", () => {
    const authors: string[] = [];
    for (let l = 0; l <= 100; l++) authors.push(quip(mk(162 - l, l), []).author);
    const counts = new Map<string, number>();
    for (const a of authors) counts.set(a, (counts.get(a) ?? 0) + 1);
    // The four broadcaster voices the result screen should surface across the range.
    for (const v of ["Vin Scully", "Jack Buck", "Harry Caray", "Bob Uecker"]) {
      expect(authors).toContain(v);
    }
    expect(counts.size).toBeGreaterThanOrEqual(6);
    expect(Math.max(...counts.values()) / authors.length).toBeLessThan(0.5);
  });
  it("resolves the top performer's drafted name", () => {
    const picks = [{ slot: "RF" as const, playerId: "ruth", name: "Babe Ruth", kind: "hitter" as const, tag: "'27 NYY" }];
    expect(topPerformerName(mk(162, 0), picks)).toBe("Babe Ruth");
  });
});

describe("playerSeasonStats", () => {
  // 3 games so each starter (game-1)%3 gets exactly one start; per-inning opponent
  // runs drive the reconstructed pitching lines.
  const hit = (playerId: string, pa: number, h: number, b2: number, hr: number, bb: number, rbi: number, r: number): BattingLine => ({ playerId, pa, h, b2, b3: 0, hr, bb, rbi, r });
  const glog = (gameNum: number, pitching: GameLog["pitching"]): GameLog => ({
    game: gameNum,
    home: { runs: 5, hits: 9, innings: [] },
    away: { runs: pitching.spR + pitching.rpR, hits: 5, innings: [] },
    batting: [hit("h1", 4, 2, 1, 1, 0, 2, 1), hit("h2", 4, 1, 0, 0, 1, 0, 0)],
    pitching,
    win: true,
  });
  const result: SeasonResult = {
    record: { w: 3, l: 0 },
    grade: "A+",
    highlights: { longestWinStreak: 3, noHitters: 0, bestGame: 1, worstGame: 1, topPerformer: "h1" },
    gameLogs: [
      glog(1, { spIp: 8, spR: 1, rpIp: 1, rpR: 2 }),
      glog(2, { spIp: 8, spR: 1, rpIp: 1, rpR: 0 }),
      glog(3, { spIp: 9, spR: 0, rpIp: 0, rpR: 0 }), // SP3 complete-game shutout — reliever sits
    ],
  };
  const picks = [
    { slot: "C", playerId: "h1", name: "Hitter One", kind: "hitter", tag: "" },
    { slot: "1B", playerId: "h2", name: "Hitter Two", kind: "hitter", tag: "" },
    { slot: "SP1", playerId: "sp1", name: "Starter One", kind: "sp", tag: "" },
    { slot: "SP2", playerId: "sp2", name: "Starter Two", kind: "sp", tag: "" },
    { slot: "SP3", playerId: "sp3", name: "Starter Three", kind: "sp", tag: "" },
    { slot: "RP", playerId: "rp", name: "Reliever", kind: "rp", tag: "" },
  ] as DraftPick[];

  const { hitters, pitchers } = playerSeasonStats(result, picks);

  it("aggregates hitter slash lines in batting order", () => {
    expect(hitters.map((h) => h.playerId)).toEqual(["h1", "h2"]);
    const h1 = hitters[0]!;
    expect([h1.pa, h1.ab, h1.h, h1.hr, h1.rbi, h1.r]).toEqual([12, 12, 6, 3, 6, 3]);
    expect(h1.avg).toBeCloseTo(0.5, 5); // 6/12
    expect(h1.slg).toBeCloseTo(1.5, 5); // 18 TB / 12 AB
    expect(h1.ops).toBeCloseTo(2.0, 5);
    const h2 = hitters[1]!;
    expect([h2.ab, h2.bb]).toEqual([9, 3]); // AB = PA - BB
    expect(h2.obp).toBeCloseTo(0.5, 5); // (3 H + 3 BB) / 12 PA
  });

  it("attributes pitcher lines from each game's recorded split", () => {
    const by = Object.fromEntries(pitchers.map((p) => [p.playerId, p]));
    expect(by.sp1).toMatchObject({ gs: 1, ip: 8, r: 1 });
    expect(by.sp1!.era).toBeCloseTo(1.125, 5); // 1*9/8
    expect(by.sp3).toMatchObject({ gs: 1, ip: 9, r: 0 }); // complete game
    expect(by.rp).toMatchObject({ role: "RP", g: 2, ip: 2, r: 2 }); // only games 1 & 2 (not the CG)
    expect(by.rp!.era).toBeCloseTo(9, 5); // 2*9/2
  });
});

describe("primaryHighlight", () => {
  it("returns a non-empty, deterministic feat", () => {
    const r = mk(150, 12, { noHitters: 2 });
    expect(primaryHighlight(r).length).toBeGreaterThan(0);
    expect(primaryHighlight(r)).toBe(primaryHighlight(r));
  });
});
