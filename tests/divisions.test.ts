import { describe, expect, it } from "vitest";

import { dailyTheme, dailyThemeName, divisionOf, eligibleCells } from "../src/lib/divisions";
import type { SpinCell } from "../src/lib/types";

const ALL_30 = [
  "NYY", "BOS", "BAL", "TBD", "TOR", "CLE", "CHW", "DET", "MIN", "KCR",
  "OAK", "HOU", "ANA", "TEX", "SEA", "ATL", "PHI", "NYM", "WSN", "FLA",
  "STL", "CHC", "CIN", "PIT", "MIL", "LAD", "SFG", "ARI", "SDP", "COL",
];

const cell = (franchiseId: string, decade: number, allStar = false): SpinCell => ({
  franchiseId, franchise: `${franchiseId} club`, decade, chunk: `td/${franchiseId}-${decade}.json`, counts: { hitters: 9, sp: 3, rp: 1 }, allStar,
});

describe("divisions", () => {
  it("maps all 30 current franchises to a division", () => {
    for (const f of ALL_30) expect(divisionOf(f)).toBeDefined();
    expect(new Set(ALL_30).size).toBe(30);
  });

  it("NL Central holds the right five franchises", () => {
    for (const f of ["STL", "CHC", "CIN", "PIT", "MIL"]) expect(divisionOf(f)).toBe("NLC");
  });

  it("maps weekdays to themes (Wed = NL Central, Sun = All-Stars)", () => {
    // 2026-06-17 is a Wednesday; 2026-06-21 is a Sunday (UTC).
    expect(dailyTheme("2026-06-17")).toBe("NLC");
    expect(dailyThemeName("2026-06-17")).toBe("NL Central");
    expect(dailyTheme("2026-06-21")).toBe("ALLSTAR");
    expect(dailyThemeName("2026-06-21")).toBe("All-Stars");
  });

  it("eligibleCells filters to the day's division", () => {
    const pool = [cell("STL", 1940), cell("CHC", 1960), cell("NYY", 1990), cell("LAD", 1980)];
    const wed = eligibleCells(pool, "2026-06-17"); // NL Central
    expect(wed.map((c) => c.franchiseId).sort()).toEqual(["CHC", "STL"]);
  });

  it("eligibleCells on Sunday returns only the All-Star cells", () => {
    const pool = [cell("STL", 1940, true), cell("STL", 1960, false), cell("NYY", 1990, true)];
    const sun = eligibleCells(pool, "2026-06-21");
    expect(sun.every((c) => c.allStar)).toBe(true);
    expect(sun.map((c) => c.franchiseId).sort()).toEqual(["NYY", "STL"]);
  });
});
