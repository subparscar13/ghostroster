/**
 * Pure spin mechanics over the spin index (T041). The initial spin picks a uniformly
 * random eligible cell; the two per-run re-rolls (FR-001) re-roll one reel each:
 * "team" lands a different franchise, "era" a different decade of the same franchise.
 * RNG is injected (`() => number` in [0,1)) — classic uses Math.random; the daily
 * (M4) passes a seeded stream so everyone gets the same spins.
 */

import type { SpinCell, TeamsIndex } from "./types";

export type Rng = () => number;

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/** A uniformly random eligible cell. */
export function randomCell(index: TeamsIndex, rng: Rng): SpinCell {
  return pick(index.cells, rng);
}

/** True if the current franchise has another decade to roll into. */
export function canRerollEra(index: TeamsIndex, current: SpinCell): boolean {
  return index.cells.some((c) => c.franchiseId === current.franchiseId && c.decade !== current.decade);
}

/** True if another franchise is available in the current decade. */
export function canRerollTeam(index: TeamsIndex, current: SpinCell): boolean {
  return index.cells.some((c) => c.decade === current.decade && c.franchiseId !== current.franchiseId);
}

/** Re-roll the team reel: a different franchise in the SAME decade (the decade
 * stays fixed). Falls back to current if no other franchise has this decade —
 * callers should gate on `canRerollTeam` to disable the button instead. */
export function rerollTeam(index: TeamsIndex, current: SpinCell, rng: Rng): SpinCell {
  const sameDecade = index.cells.filter((c) => c.decade === current.decade && c.franchiseId !== current.franchiseId);
  return sameDecade.length ? pick(sameDecade, rng) : current;
}

/** Re-roll the era reel: a different decade of the same franchise (falls back to current if none). */
export function rerollEra(index: TeamsIndex, current: SpinCell, rng: Rng): SpinCell {
  const sameTeam = index.cells.filter((c) => c.franchiseId === current.franchiseId && c.decade !== current.decade);
  return sameTeam.length ? pick(sameTeam, rng) : current;
}
