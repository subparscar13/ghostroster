/**
 * mulberry32 — the seeded PRNG for the whole sim (constitution II).
 *
 * Chosen for being tiny, fast, and *exactly reproducible across browsers*: it uses
 * only 32-bit integer ops (`| 0`, `>>>`, `Math.imul`, `^`), all of which are fully
 * specified by ECMAScript with no platform-dependent floating point. The same seed
 * therefore yields a byte-identical stream on every engine — the property the daily
 * challenge (one shared seed per date) and the golden-master tests depend on.
 *
 * Pure and self-contained: no globals, no `Math.random`, no I/O, no wall-clock. The
 * only state is the closure's `a`, advanced on each call. Reference algorithm by
 * Tommy Ettinger / "bryc" (public domain).
 */

/** A seeded source of uniform floats in [0, 1). Call repeatedly to advance the stream. */
export type Rng = () => number;

/**
 * Construct a mulberry32 generator from a 32-bit seed.
 * The seed is coerced to a uint32, so any integer (e.g. a date hash) is accepted.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash an arbitrary string to a uint32 seed (FNV-1a). Used for the daily seed
 * `hash(salt + YYYY-MM-DD)` (constitution II). Deterministic and platform-stable.
 */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
