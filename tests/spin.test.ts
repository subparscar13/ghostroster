import { describe, expect, it } from "vitest";

import { canRerollEra, canRerollTeam, randomCell, rerollEra, rerollTeam } from "../src/lib/spin";
import { mulberry32 } from "../src/sim/rng";
import type { SpinCell } from "../src/lib/types";

function cell(franchiseId: string, decade: number): SpinCell {
  return { franchiseId, franchise: `${franchiseId} club`, decade, chunk: `td/${franchiseId}-${decade}.json`, counts: { hitters: 9, sp: 3, rp: 1 } };
}

// NYA & BOS both have a 1920s cell (team re-roll target); LAN-1960 is the lone 1960s cell.
const cells: SpinCell[] = [cell("NYA", 1920), cell("BOS", 1920), cell("NYA", 1930), cell("BOS", 1940), cell("LAN", 1960)];

const rng = mulberry32(1);

describe("spin mechanics", () => {
  it("randomCell returns a cell from the pool", () => {
    for (let i = 0; i < 50; i++) expect(cells).toContain(randomCell(cells, () => rng()));
  });

  it("team re-roll lands a different franchise, preferring the same decade", () => {
    const current = cell("NYA", 1920);
    for (let i = 0; i < 50; i++) {
      const next = rerollTeam(cells, current, () => rng());
      expect(next.franchiseId).not.toBe("NYA");
      expect(next.decade).toBe(1920); // BOS-1920 shares the decade, so it's preferred
    }
  });

  it("team re-roll falls back to another franchise (any decade) when no decade-peer exists", () => {
    const current = cell("LAN", 1960); // alone in the 1960s, but NYA/BOS exist elsewhere
    for (let i = 0; i < 50; i++) {
      expect(rerollTeam(cells, current, () => rng()).franchiseId).not.toBe("LAN");
    }
  });

  it("canRerollTeam is true whenever the pool holds another franchise", () => {
    expect(canRerollTeam(cells, cell("LAN", 1960))).toBe(true); // NYA/BOS exist
    expect(canRerollTeam([cell("LAN", 1960), cell("LAN", 1970)], cell("LAN", 1960))).toBe(false); // single franchise
  });

  it("team re-roll returns current when the pool has no other franchise", () => {
    const onlyLan = [cell("LAN", 1960)];
    expect(rerollTeam(onlyLan, cell("LAN", 1960), () => rng())).toEqual(cell("LAN", 1960));
  });

  it("era re-roll keeps the franchise but changes the decade", () => {
    const current = cell("NYA", 1920);
    for (let i = 0; i < 50; i++) {
      const next = rerollEra(cells, current, () => rng());
      expect(next.franchiseId).toBe("NYA");
      expect(next.decade).not.toBe(1920);
    }
  });

  it("canRerollEra is false for a single-decade franchise", () => {
    expect(canRerollEra(cells, cell("LAN", 1960))).toBe(false);
    expect(canRerollEra(cells, cell("NYA", 1920))).toBe(true);
  });

  it("era re-roll falls back to current when no other decade exists", () => {
    const lone = cell("LAN", 1960);
    expect(rerollEra(cells, lone, () => rng())).toEqual(lone);
  });
});
