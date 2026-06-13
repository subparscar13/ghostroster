import { describe, expect, it } from "vitest";

import { canRerollEra, canRerollTeam, randomCell, rerollEra, rerollTeam } from "../src/lib/spin";
import { mulberry32 } from "../src/sim/rng";
import type { SpinCell, TeamsIndex } from "../src/lib/types";

function cell(franchiseId: string, decade: number): SpinCell {
  return { franchiseId, franchise: `${franchiseId} club`, decade, chunk: `td/${franchiseId}-${decade}.json`, counts: { hitters: 9, sp: 3, rp: 1 } };
}

const index: TeamsIndex = {
  edition: "test",
  // NYA & BOS both have a 1920s cell (team re-roll target); LAN-1960 is the lone 1960s cell.
  cells: [cell("NYA", 1920), cell("BOS", 1920), cell("NYA", 1930), cell("BOS", 1940), cell("LAN", 1960)],
};

const rng = mulberry32(1);

describe("spin mechanics", () => {
  it("randomCell returns a cell from the index", () => {
    for (let i = 0; i < 50; i++) expect(index.cells).toContain(randomCell(index, () => rng()));
  });

  it("team re-roll lands a different franchise in the SAME decade", () => {
    const current = cell("NYA", 1920);
    for (let i = 0; i < 50; i++) {
      const next = rerollTeam(index, current, () => rng());
      expect(next.franchiseId).not.toBe("NYA");
      expect(next.decade).toBe(1920);
    }
  });

  it("canRerollTeam reflects whether another franchise shares the decade", () => {
    expect(canRerollTeam(index, cell("NYA", 1920))).toBe(true); // BOS-1920 exists
    expect(canRerollTeam(index, cell("LAN", 1960))).toBe(false); // lone 1960s cell
  });

  it("team re-roll falls back to current when no other franchise shares the decade", () => {
    const lone = cell("LAN", 1960);
    expect(rerollTeam(index, lone, () => rng())).toEqual(lone);
  });

  it("era re-roll keeps the franchise but changes the decade", () => {
    const current = cell("NYA", 1920);
    for (let i = 0; i < 50; i++) {
      const next = rerollEra(index, current, () => rng());
      expect(next.franchiseId).toBe("NYA");
      expect(next.decade).not.toBe(1920);
    }
  });

  it("canRerollEra is false for a single-decade franchise", () => {
    expect(canRerollEra(index, cell("LAN", 1960))).toBe(false);
    expect(canRerollEra(index, cell("NYA", 1920))).toBe(true);
  });

  it("era re-roll falls back to current when no other decade exists", () => {
    const lone = cell("LAN", 1960);
    expect(rerollEra(index, lone, () => rng())).toEqual(lone);
  });
});
