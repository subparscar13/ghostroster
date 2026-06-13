import { describe, expect, it } from "vitest";

import {
  ALL_SLOTS,
  autoSlotHitter,
  autoSlotPitcher,
  buildSimRoster,
  draftHitter,
  draftPitcher,
  hitterEligible,
  isComplete,
  needs,
} from "../src/lib/draft";
import { NEUTRAL } from "../src/sim/baseline";
import type { DraftPick, PoolHitter, PoolPitcher } from "../src/lib/types";

const hitter = (id: string, pos: string[]): PoolHitter => ({
  playerId: id,
  name: id,
  pos,
  vector: NEUTRAL,
  display: { year: 1990, team: "XXX", G: 150, PA: 600, AB: 540, H: 160, "2B": 30, "3B": 3, HR: 25, BB: 55, HBP: 5, SO: 90, AVG: "0.296", OPS: "0.900" },
});
const pitcher = (id: string, role: "SP" | "RP"): PoolPitcher => ({
  playerId: id,
  name: id,
  role,
  allowed: NEUTRAL,
  stamina: 0.7,
  display: { year: 1990, team: "XXX", W: 18, L: 6, ERA: "2.50", G: 34, GS: 34, IP: 240, H: 200, BB: 50, SO: 220, HR: 15 },
});

describe("hitterEligible", () => {
  it("DH takes anyone (DH-loose)", () => expect(hitterEligible("DH", ["C"])).toBe(true));
  it("matches exact position", () => expect(hitterEligible("SS", ["SS"])).toBe(true));
  it("OF covers the three outfield slots", () => {
    expect(hitterEligible("LF", ["OF"])).toBe(true);
    expect(hitterEligible("CF", ["OF"])).toBe(true);
  });
  it("rejects a non-matching infield slot", () => expect(hitterEligible("1B", ["SS"])).toBe(false));
});

describe("autoSlotHitter", () => {
  it("fills the player's own position first", () => {
    expect(autoSlotHitter(["SS"], [])).toBe("SS");
  });
  it("falls back to DH when the position is taken", () => {
    const picks: DraftPick[] = [{ slot: "SS", playerId: "x", name: "x", kind: "hitter", tag: "" }];
    expect(autoSlotHitter(["SS"], picks)).toBe("DH");
  });
  it("DH-loose: uses any open hitter slot when position + DH are full", () => {
    const picks: DraftPick[] = (["SS", "DH"] as const).map((slot) => ({ slot, playerId: slot, name: slot, kind: "hitter", tag: "" }));
    const got = autoSlotHitter(["SS"], picks);
    expect(got).not.toBeNull();
    expect(["C", "1B", "2B", "3B", "LF", "CF", "RF"]).toContain(got);
  });
});

describe("autoSlotPitcher", () => {
  it("fills SP1→SP2→SP3 in order", () => {
    let picks: DraftPick[] = [];
    expect(autoSlotPitcher("SP", picks)).toBe("SP1");
    picks = [{ slot: "SP1", playerId: "a", name: "a", kind: "sp", tag: "" }];
    expect(autoSlotPitcher("SP", picks)).toBe("SP2");
  });
  it("RP fills the single RP slot then is null", () => {
    expect(autoSlotPitcher("RP", [])).toBe("RP");
    const picks: DraftPick[] = [{ slot: "RP", playerId: "r", name: "r", kind: "rp", tag: "" }];
    expect(autoSlotPitcher("RP", picks)).toBeNull();
  });
});

describe("drafting", () => {
  it("rejects a duplicate player", () => {
    const h = hitter("ruth", ["RF"]);
    const after = draftHitter(h, "'27 NYY", []);
    expect(after).not.toBeNull();
    expect(draftHitter(h, "'27 NYY", after!)).toBeNull();
  });

  it("returns null when the category is full", () => {
    let picks: DraftPick[] = [];
    for (let i = 0; i < 9; i++) {
      const next = draftHitter(hitter(`h${i}`, ["DH"]), "", picks);
      expect(next).not.toBeNull();
      picks = next!;
    }
    expect(draftHitter(hitter("h9", ["DH"]), "", picks)).toBeNull(); // lineup full
  });

  it("needs counts down as slots fill", () => {
    expect(needs([])).toEqual({ hitters: 9, sp: 3, rp: 1 });
  });
});

describe("buildSimRoster", () => {
  it("assembles a 9/3/1 roster from a complete draft", () => {
    let picks: DraftPick[] = [];
    for (let i = 0; i < 9; i++) picks = draftHitter(hitter(`h${i}`, ["DH"]), "", picks)!;
    for (let i = 0; i < 3; i++) picks = draftPitcher(pitcher(`s${i}`, "SP"), "", picks)!;
    picks = draftPitcher(pitcher("rp", "RP"), "", picks)!;

    expect(isComplete(picks)).toBe(true);
    expect(picks.length).toBe(ALL_SLOTS.length);
    const roster = buildSimRoster(picks);
    expect(roster.lineup).toHaveLength(9);
    expect(roster.rotation).toHaveLength(3);
    expect(roster.bullpen).toHaveLength(1);
  });

  it("throws on an incomplete draft", () => {
    expect(() => buildSimRoster([])).toThrow();
  });
});
