import { describe, expect, it } from "vitest";

import { buildSubmission, validateInitials } from "../src/lib/leaderboard";
import type { GameLog, SeasonResult } from "../src/sim/types";

const glog = (g: number, home: number, away: number): GameLog => ({
  game: g,
  home: { runs: home, hits: 0, innings: [] },
  away: { runs: away, hits: 0, innings: [] },
  batting: [],
  pitching: { spIp: 8, spR: away, rpIp: 1, rpR: 0 },
  win: home > away,
});

const result: SeasonResult = {
  record: { w: 150, l: 12 },
  grade: "A",
  highlights: { longestWinStreak: 5, noHitters: 0, bestGame: 1, worstGame: 2, topPerformer: "" },
  gameLogs: [glog(1, 7, 2), glog(2, 3, 5)],
};

describe("validateInitials", () => {
  it("accepts exactly three letters, upper-casing", () => {
    expect(validateInitials("abc")).toBe("ABC");
    expect(validateInitials(" Jd k ".trim().length === 3 ? "jdk" : "jdk")).toBe("JDK");
  });
  it("rejects anything that isn't three letters", () => {
    for (const bad of ["", "AB", "ABCD", "A1C", "a c", "  "]) expect(validateInitials(bad)).toBeNull();
  });
});

describe("buildSubmission", () => {
  const sub = buildSubmission("2026-06-17", "ABC", result); // Wednesday → NL Central

  it("carries the record, grade, and the day's division", () => {
    expect(sub).toMatchObject({ dateKey: "2026-06-17", initials: "ABC", wins: 150, losses: 12, grade: "A", division: "NL Central" });
  });
  it("computes run differential from the logs", () => {
    expect(sub.runDiff).toBe(7 + 3 - (2 + 5)); // runsFor − runsAgainst = 3
  });
  it("includes spoiler squares and no roster", () => {
    expect(typeof sub.squares).toBe("string");
    expect(sub).not.toHaveProperty("picks");
    expect(sub.deviceId).toBe(""); // SSR/node: no window, so empty (a real browser fills it)
  });
});
