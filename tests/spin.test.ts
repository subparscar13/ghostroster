import { describe, expect, it } from "vitest";

import { canRerollEra, randomCell, rerollEra, rerollTeam } from "../src/lib/spin";
import { mulberry32 } from "../src/sim/rng";
import type { SpinCell, TeamsIndex } from "../src/lib/types";

function cell(franchiseId: string, decade: number): SpinCell {
  return { franchiseId, franchise: `${franchiseId} club`, decade, chunk: `td/${franchiseId}-${decade}.json`, counts: { hitters: 9, sp: 3, rp: 1 } };
}

const index: TeamsIndex = {
  edition: "test",
  cells: [cell("NYA", 1920), cell("NYA", 1930), cell("BOS", 1910), cell("BOS", 1940), cell("LAN", 1960)],
};

const rng = mulberry32(1);

describe("spin mechanics", () => {
  it("randomCell returns a cell from the index", () => {
    for (let i = 0; i < 50; i++) expect(index.cells).toContain(randomCell(index, () => rng()));
  });

  it("team re-roll lands a different franchise", () => {
    const current = cell("NYA", 1920);
    for (let i = 0; i < 50; i++) {
      expect(rerollTeam(index, current, () => rng()).franchiseId).not.toBe("NYA");
    }
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
