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
// One position per hitter slot, so nine hitters fill the lineup under strict slotting.
const POS9: string[][] = [["C"], ["1B"], ["2B"], ["3B"], ["SS"], ["LF"], ["CF"], ["RF"], ["DH"]];

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
  it("returns null when the position and DH are both full (strict — no off-position fallback)", () => {
    const picks: DraftPick[] = (["SS", "DH"] as const).map((slot) => ({ slot, playerId: slot, name: slot, kind: "hitter", tag: "" }));
    expect(autoSlotHitter(["SS"], picks)).toBeNull();
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

  it("returns null when no eligible slot is open", () => {
    let picks: DraftPick[] = [];
    POS9.forEach((pos, i) => {
      const next = draftHitter(hitter(`h${i}`, pos), "", picks);
      expect(next).not.toBeNull();
      picks = next!;
    });
    // lineup full: a 1B-only player has no open eligible slot (1B + DH taken).
    expect(draftHitter(hitter("h9", ["1B"]), "", picks)).toBeNull();
  });

  it("needs counts down as slots fill", () => {
    expect(needs([])).toEqual({ hitters: 9, sp: 3, rp: 1 });
  });
});

describe("buildSimRoster", () => {
  it("assembles a 9/3/1 roster from a complete draft", () => {
    let picks: DraftPick[] = [];
    POS9.forEach((pos, i) => (picks = draftHitter(hitter(`h${i}`, pos), "", picks)!));
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

  it("bats the lineup in descending OPS order", () => {
    const ops = ["0.700", "1.100", "0.850", "0.950", "0.600", "1.000", "0.800", "0.900", "0.750"];
    let picks: DraftPick[] = [];
    ops.forEach((o, i) => {
      const h = hitter(`h${i}`, POS9[i]!);
      h.display.OPS = o;
      picks = draftHitter(h, "", picks)!;
    });
    for (let i = 0; i < 3; i++) picks = draftPitcher(pitcher(`s${i}`, "SP"), "", picks)!;
    picks = draftPitcher(pitcher("rp", "RP"), "", picks)!;

    const lineupIds = buildSimRoster(picks).lineup.map((h) => h.playerId);
    expect(lineupIds).toEqual(["h1", "h5", "h3", "h7", "h2", "h6", "h8", "h0", "h4"]);
  });
});
