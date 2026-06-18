/**
 * Pure spin mechanics over a pool of eligible cells (T041). The initial spin picks a
 * uniformly random cell; the two per-run re-rolls (FR-001) re-roll one reel each:
 * "team" lands a different franchise, "era" a different decade of the same franchise.
 * RNG is injected (`() => number` in [0,1)) — classic uses Math.random; the daily
 * passes a seeded stream so everyone gets the same spins.
 *
 * The pool is the full spin index for classic, or the day's division/All-Star subset
 * for the daily (D-015). Team re-roll keeps the decade when the pool allows it (so
 * classic is unchanged) and otherwise falls back to any other franchise in the pool —
 * which is what lets a ~5-franchise division still offer a team re-roll.
 */

import type { SpinCell } from "./types";

export type Rng = () => number;

/** Re-rolls allowed per run, for each of team and decade (FR-001). */
export const REROLLS_PER_RUN = 2;

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/** A uniformly random cell from the pool. */
export function randomCell(cells: SpinCell[], rng: Rng): SpinCell {
  return pick(cells, rng);
}

/** True if the current franchise has another decade in the pool. */
export function canRerollEra(cells: SpinCell[], current: SpinCell): boolean {
  return cells.some((c) => c.franchiseId === current.franchiseId && c.decade !== current.decade);
}

/** True if another franchise is available in the pool. */
export function canRerollTeam(cells: SpinCell[], current: SpinCell): boolean {
  return cells.some((c) => c.franchiseId !== current.franchiseId);
}

/** Re-roll the team reel: a different franchise, preferring the same decade (keeps the
 * classic feel); falls back to any other franchise in the pool (e.g. within a division
 * where only one franchise has the current decade). */
export function rerollTeam(cells: SpinCell[], current: SpinCell, rng: Rng): SpinCell {
  const sameDecade = cells.filter((c) => c.decade === current.decade && c.franchiseId !== current.franchiseId);
  const others = sameDecade.length ? sameDecade : cells.filter((c) => c.franchiseId !== current.franchiseId);
  return others.length ? pick(others, rng) : current;
}

/** Re-roll the era reel: a different decade of the same franchise (falls back to current if none). */
export function rerollEra(cells: SpinCell[], current: SpinCell, rng: Rng): SpinCell {
  const sameTeam = cells.filter((c) => c.franchiseId === current.franchiseId && c.decade !== current.decade);
  return sameTeam.length ? pick(sameTeam, rng) : current;
}
