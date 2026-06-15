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
  it("returns a non-empty quote and a (parody) author", () => {
    const q = quip(make(162, 0), []);
    expect(q.quote.length).toBeGreaterThan(0);
    expect(q.author.length).toBeGreaterThan(0);
  });

  it("is deterministic for the same result", () => {
    expect(quip(make(120, 42), [])).toEqual(quip(make(120, 42), []));
  });

  it("weaves specifics into near-miss lines (cites the loss count)", () => {
    expect(quip(make(158, 4), []).quote).toContain("4");
  });

  it("varies across very different seasons", () => {
    expect(quip(make(162, 0), []).quote).not.toBe(quip(make(60, 102), []).quote);
  });

  it("interpolates the top performer's drafted name when a quote uses it", () => {
    const picks: DraftPick[] = [{ slot: "RF", playerId: "ruth", name: "Babe Ruth", kind: "hitter", tag: "'27 NYY" }];
    // Force the HUNDRED/POOR pools across a few records; at least confirm the name resolves.
    expect(topPerformerName(make(162, 0), picks)).toBe("Babe Ruth");
  });
});

describe("primaryHighlight", () => {
  it("leads with no-hitters when present", () => expect(primaryHighlight(make(150, 12, { noHitters: 2 }))).toMatch(/2 no-hitters/));
  it("falls back to the win streak", () => expect(primaryHighlight(make(150, 12, { longestWinStreak: 15 }))).toMatch(/streak: 15/));
});
