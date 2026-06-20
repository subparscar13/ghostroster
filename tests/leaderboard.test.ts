import { describe, expect, it } from "vitest";

import { buildSubmission, hasSubmitted, markSubmitted, submittedKey, validateName } from "../src/lib/leaderboard";
import type { DraftPick } from "../src/lib/types";
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

describe("validateName", () => {
  it("accepts 1–10 letters/digits, upper-casing", () => {
    expect(validateName("abc")).toBe("ABC");
    expect(validateName("justin")).toBe("JUSTIN");
    expect(validateName("BigPapi34")).toBe("BIGPAPI34");
    expect(validateName("A")).toBe("A");
    expect(validateName("ABCDEFGHIJ")).toBe("ABCDEFGHIJ"); // exactly 10
  });
  it("rejects empty, too long, or non-alphanumeric", () => {
    for (const bad of ["", "ABCDEFGHIJK", "a c", "JD!", "  "]) expect(validateName(bad)).toBeNull();
  });
});

describe("buildSubmission", () => {
  const picks = [
    { slot: "C", playerId: "h1", name: "H1", kind: "hitter", tag: "", chunk: "td/NYY-1990.json" },
    { slot: "SP1", playerId: "p1", name: "P1", kind: "sp", tag: "", chunk: "td/BOS-2000.json" },
  ] as DraftPick[];
  const sub = buildSubmission("daily", "2026-06-17", "ABC", result, picks); // Wednesday → NL Central

  it("carries the mode, record, grade, and the day's division", () => {
    expect(sub).toMatchObject({ mode: "daily", dateKey: "2026-06-17", initials: "ABC", wins: 150, losses: 12, grade: "A", division: "NL Central" });
  });
  it("computes run differential from the logs", () => {
    expect(sub.runDiff).toBe(7 + 3 - (2 + 5)); // runsFor − runsAgainst = 3
  });
  it("sends the roster as (playerId, slot, chunk) only — no vectors", () => {
    expect(sub.picks).toEqual([
      { playerId: "h1", slot: "C", chunk: "td/NYY-1990.json" },
      { playerId: "p1", slot: "SP1", chunk: "td/BOS-2000.json" },
    ]);
    expect(typeof sub.squares).toBe("string");
    expect(sub.deviceId).toBe(""); // SSR/node: no window (a real browser fills it)
  });
  it("classic mode carries the seed and a 'Classic' division", () => {
    const c = buildSubmission("classic", "2026-06-17", "ABC", result, picks, 12345);
    expect(c).toMatchObject({ mode: "classic", division: "Classic", seed: 12345 });
    expect(sub).not.toHaveProperty("seed"); // daily omits the seed (server derives it)
  });
  it("classic carries a non-zero reload count (refresh-exploit flag); omits it when zero", () => {
    expect(buildSubmission("classic", "2026-06-17", "ABC", result, picks, 12345, 2)).toMatchObject({ reloads: 2 });
    expect(buildSubmission("classic", "2026-06-17", "ABC", result, picks, 12345, 0)).not.toHaveProperty("reloads");
  });
  it("daily never carries reloads (a daily refresh gains nothing)", () => {
    expect(buildSubmission("daily", "2026-06-17", "ABC", result, picks, undefined, 3)).not.toHaveProperty("reloads");
  });
});

describe("submittedKey", () => {
  it("keys the daily by date (one challenge per day, regardless of seed)", () => {
    expect(submittedKey("daily", "2026-06-17")).toBe("daily:2026-06-17");
    expect(submittedKey("daily", "2026-06-17", 999)).toBe("daily:2026-06-17");
  });
  it("keys classic by seed (a new run → a new prompt)", () => {
    expect(submittedKey("classic", "2026-06-17", 12345)).toBe("classic:12345");
    expect(submittedKey("classic", "2026-06-17", 12345)).not.toBe(submittedKey("classic", "2026-06-17", 67890));
  });
  it("falls back to the date when a classic seed is missing", () => {
    expect(submittedKey("classic", "2026-06-17")).toBe("classic:2026-06-17");
  });
});

describe("hasSubmitted / markSubmitted (SSR-safe)", () => {
  it("no-ops gracefully with no window (node): unposted, and marking never throws", () => {
    const key = submittedKey("daily", "2026-06-17");
    expect(hasSubmitted(key)).toBe(false);
    expect(() => markSubmitted(key)).not.toThrow();
    expect(hasSubmitted(key)).toBe(false); // still false — nothing persisted without localStorage
  });
});
