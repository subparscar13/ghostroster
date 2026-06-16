import { describe, expect, it } from "vitest";

import { dailyNumber, dailyRng, dailySeed, dailyShareText, spoilerSquares } from "../src/lib/daily";
import type { GameLog, SeasonResult } from "../src/sim/types";

function mkResult(wins: boolean[]): SeasonResult {
  const gameLogs: GameLog[] = wins.map((win, i) => ({
    game: i + 1,
    home: { runs: 0, hits: 0, innings: [] },
    away: { runs: 0, hits: 0, innings: [] },
    batting: [],
    pitching: { spIp: 8, spR: 0, rpIp: 1, rpR: 0 },
    win,
  }));
  const w = wins.filter(Boolean).length;
  return {
    record: { w, l: wins.length - w },
    gameLogs,
    grade: "A",
    highlights: { longestWinStreak: 0, noHitters: 0, bestGame: 0, worstGame: 0, topPerformer: "" },
  };
}

describe("dailyNumber", () => {
  it("counts days from the launch epoch (2026-06-01 = #1)", () => {
    expect(dailyNumber("2026-06-01")).toBe(1);
    expect(dailyNumber("2026-06-02")).toBe(2);
    expect(dailyNumber("2026-07-01")).toBe(31);
  });
});

describe("daily seeding", () => {
  it("dailySeed is deterministic per date and differs across dates", () => {
    expect(dailySeed("2026-06-14")).toBe(dailySeed("2026-06-14"));
    expect(dailySeed("2026-06-14")).not.toBe(dailySeed("2026-06-15"));
  });

  it("dailyRng reproduces the same value for the same (date, key) and differs by key", () => {
    expect(dailyRng("2026-06-14", "spin:1")()).toBe(dailyRng("2026-06-14", "spin:1")());
    expect(dailyRng("2026-06-14", "spin:1")()).not.toBe(dailyRng("2026-06-14", "spin:2")());
  });
});

describe("spoilerSquares", () => {
  it("is all green for a perfect season (3 rows of 6)", () => {
    const sq = spoilerSquares(mkResult(Array(162).fill(true)));
    expect(sq.split("\n")).toEqual(["🟩🟩🟩🟩🟩🟩", "🟩🟩🟩🟩🟩🟩", "🟩🟩🟩🟩🟩🟩"]);
  });

  it("marks a losing stretch red", () => {
    const wins = Array(162).fill(true);
    for (let i = 0; i < 9; i++) wins[i] = false; // first 9-game bucket all losses
    expect(spoilerSquares(mkResult(wins)).startsWith("🟥")).toBe(true);
  });
});

describe("dailyShareText", () => {
  it("is spoiler-safe: number, record, squares, link — no player names", () => {
    const text = dailyShareText("2026-06-01", mkResult(Array(162).fill(true)));
    expect(text).toContain("Ghost Roster #1");
    expect(text).toContain("162-0");
    expect(text).toContain("ghostroster.app");
    expect(text).toContain("🟩");
  });
});
