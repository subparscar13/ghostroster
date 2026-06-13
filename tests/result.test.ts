import { describe, expect, it } from "vitest";

import { primaryHighlight, quip, topPerformerName } from "../src/lib/result";
import type { DraftPick } from "../src/lib/types";
import type { Highlights, SeasonResult } from "../src/sim/types";

const make = (w: number, l: number, h: Partial<Highlights> = {}): SeasonResult => ({
  record: { w, l },
  gameLogs: [],
  grade: "A",
  highlights: { longestWinStreak: 10, noHitters: 0, bestGame: 1, worstGame: 2, topPerformer: "ruth", ...h },
});

describe("quip", () => {
  it("celebrates a perfect season", () => expect(quip(make(162, 0))).toMatch(/perfection/i));
  it("laments a near miss", () => expect(quip(make(159, 3))).toContain("3"));
  it("has a fallback for a poor season", () => expect(quip(make(60, 102))).toMatch(/character/i));
  it("is deterministic", () => expect(quip(make(120, 42))).toBe(quip(make(120, 42))));
});

describe("primaryHighlight", () => {
  it("leads with no-hitters when present", () => expect(primaryHighlight(make(150, 12, { noHitters: 2 }))).toMatch(/2 no-hitters/));
  it("falls back to the win streak", () => expect(primaryHighlight(make(150, 12, { longestWinStreak: 15 }))).toMatch(/streak: 15/));
});

describe("topPerformerName", () => {
  it("resolves the id to the drafted name", () => {
    const picks: DraftPick[] = [{ slot: "RF", playerId: "ruth", name: "Babe Ruth", kind: "hitter", tag: "'27 NYY" }];
    expect(topPerformerName(make(162, 0), picks)).toBe("Babe Ruth");
  });
  it("falls back to the id when not found", () => {
    expect(topPerformerName(make(162, 0), [])).toBe("ruth");
  });
});
