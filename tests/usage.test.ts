import { describe, expect, it } from "vitest";

import { LEAGUE_AVERAGE_OPPONENT } from "../src/sim/baseline";
import { playGame } from "../src/sim/game";
import { mulberry32 } from "../src/sim/rng";
import type { Hitter, OutcomeVector, Pitcher, Roster } from "../src/sim/types";

/** Pitcher usage rule (D-013): starter goes innings 1–8, then finishes only while he's
 * still no-hitting; otherwise the reliever closes. Exercised on the real playGame. */
const vec = (bb: number, b1: number, b2: number, b3: number, hr: number): OutcomeVector => ({ bb, b1, b2, b3, hr, out: 1 - (bb + b1 + b2 + b3 + hr) });
const hitter = (i: number, v: OutcomeVector): Hitter => ({ playerId: `h${i}`, name: `H${i}`, pos: ["DH"], vector: v });
const pitcher = (id: string, role: "SP" | "RP", allowed: OutcomeVector): Pitcher => ({ playerId: id, name: id, role, allowed, stamina: 0.7 });

// Strong bats so my team wins in 9 (no endless extras); SP/RP vary by test.
const SLUGGER = vec(0.1, 0.15, 0.06, 0.01, 0.2);
const roster = (spAllowed: OutcomeVector, rpAllowed: OutcomeVector): Roster => ({
  lineup: Array.from({ length: 9 }, (_, i) => hitter(i, SLUGGER)),
  rotation: [pitcher("sp1", "SP", spAllowed), pitcher("sp2", "SP", spAllowed), pitcher("sp3", "SP", spAllowed)],
  bullpen: [pitcher("rp", "RP", rpAllowed)],
});

const ALL_OUT = vec(0, 0, 0, 0, 0); // out = 1.0
const HITTABLE = vec(0, 0.5, 0, 0, 0); // half singles, half outs

describe("starter usage rule", () => {
  it("lets the starter complete a no-hitter (reliever never enters)", () => {
    const log = playGame(roster(ALL_OUT, ALL_OUT), LEAGUE_AVERAGE_OPPONENT, 0, mulberry32(1), 1);
    expect(log.away.hits).toBe(0); // no-hitter
    expect(log.pitching.rpIp).toBe(0); // reliever sat
    expect(log.pitching.spIp).toBe(log.away.innings.length); // starter threw every inning
    expect(log.pitching.spIp).toBeGreaterThanOrEqual(9);
  });

  it("pulls the starter after 8 once a hit is allowed; reliever finishes", () => {
    const log = playGame(roster(HITTABLE, ALL_OUT), LEAGUE_AVERAGE_OPPONENT, 0, mulberry32(7), 1);
    expect(log.away.hits).toBeGreaterThan(0); // not a no-no
    expect(log.pitching.spIp).toBe(8); // starter went exactly 1–8
    expect(log.pitching.rpIp).toBeGreaterThanOrEqual(1); // reliever closed the 9th+
  });
});
