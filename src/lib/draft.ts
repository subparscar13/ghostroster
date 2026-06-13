/**
 * Pure draft mechanics (T043): roster slots, position-aware auto-slotting (one tap =
 * pick + slot, DH-loose per D-002), completeness/needs, and assembling the sim
 * Roster from the 13 picks. No I/O, no React.
 */

import type { Roster as SimRoster } from "@/sim/types";
import type { DraftPick, PoolHitter, PoolPitcher, Slot } from "./types";

export const HITTER_SLOTS: Slot[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];
export const PITCHER_SLOTS: Slot[] = ["SP1", "SP2", "SP3", "RP"];
export const ALL_SLOTS: Slot[] = [...HITTER_SLOTS, ...PITCHER_SLOTS];

/** Is a hitter eligible for a fielding slot? DH takes anyone (DH-loose); OF covers
 * the three outfield slots. */
export function hitterEligible(slot: Slot, pos: string[]): boolean {
  if (slot === "DH") return true;
  if (pos.includes(slot)) return true;
  if ((slot === "LF" || slot === "CF" || slot === "RF") && pos.includes("OF")) return true;
  return false;
}

const isFilled = (picks: DraftPick[], slot: Slot) => picks.some((p) => p.slot === slot);

/** The slot a hitter would take: the first open slot they're eligible for (their
 * listed positions, or DH which takes anyone). Returns null when every eligible
 * slot — including DH — is full, so the player can't be drafted (greyed out). */
export function autoSlotHitter(pos: string[], picks: DraftPick[]): Slot | null {
  for (const s of HITTER_SLOTS) if (!isFilled(picks, s) && hitterEligible(s, pos)) return s;
  return null;
}

/** The slot a pitcher would take (first open SP slot, or the RP slot), else null. */
export function autoSlotPitcher(role: "SP" | "RP", picks: DraftPick[]): Slot | null {
  if (role === "SP") {
    for (const s of ["SP1", "SP2", "SP3"] as Slot[]) if (!isFilled(picks, s)) return s;
    return null;
  }
  return isFilled(picks, "RP") ? null : "RP";
}

export type Needs = { hitters: number; sp: number; rp: number };

/** How many open slots remain, by category. */
export function needs(picks: DraftPick[]): Needs {
  return {
    hitters: HITTER_SLOTS.filter((s) => !isFilled(picks, s)).length,
    sp: (["SP1", "SP2", "SP3"] as Slot[]).filter((s) => !isFilled(picks, s)).length,
    rp: isFilled(picks, "RP") ? 0 : 1,
  };
}

export const isComplete = (picks: DraftPick[]) => picks.length === ALL_SLOTS.length;

/** Make a pick: returns the new picks array, or null if the player can't be slotted
 * (their category is full, or they're already drafted). */
export function draftHitter(h: PoolHitter, tag: string, picks: DraftPick[]): DraftPick[] | null {
  if (picks.some((p) => p.playerId === h.playerId)) return null;
  const slot = autoSlotHitter(h.pos, picks);
  if (!slot) return null;
  return [...picks, { slot, playerId: h.playerId, name: h.name, kind: "hitter", tag, hitter: h }];
}

export function draftPitcher(p: PoolPitcher, tag: string, picks: DraftPick[]): DraftPick[] | null {
  if (picks.some((x) => x.playerId === p.playerId)) return null;
  const slot = autoSlotPitcher(p.role, picks);
  if (!slot) return null;
  const kind = p.role === "SP" ? "sp" : "rp";
  return [...picks, { slot, playerId: p.playerId, name: p.name, kind, tag, pitcher: p }];
}

const bySlot = (picks: DraftPick[], slot: Slot) => picks.find((p) => p.slot === slot);

/** Assemble the pure-sim Roster from a complete set of picks (throws if incomplete). */
export function buildSimRoster(picks: DraftPick[]): SimRoster {
  if (!isComplete(picks)) throw new Error(`draft incomplete: ${picks.length}/${ALL_SLOTS.length} picks`);
  // Batting order = the 9 hitters sorted by descending OPS, so the best bats hit at
  // the top of the order (fielding slot no longer dictates lineup position).
  const hitters = HITTER_SLOTS.map((s) => {
    const h = bySlot(picks, s)?.hitter;
    if (!h) throw new Error(`missing hitter at ${s}`);
    return h;
  });
  const lineup = [...hitters]
    .sort((a, b) => Number.parseFloat(b.display.OPS) - Number.parseFloat(a.display.OPS))
    .map((h) => ({ playerId: h.playerId, name: h.name, pos: h.pos, vector: h.vector }));
  const rotation = (["SP1", "SP2", "SP3"] as Slot[]).map((s) => {
    const p = bySlot(picks, s)?.pitcher;
    if (!p) throw new Error(`missing SP at ${s}`);
    return { playerId: p.playerId, name: p.name, role: p.role, allowed: p.allowed, stamina: p.stamina };
  });
  const rp = bySlot(picks, "RP")?.pitcher;
  if (!rp) throw new Error("missing RP");
  return { lineup, rotation, bullpen: [{ playerId: rp.playerId, name: rp.name, role: rp.role, allowed: rp.allowed, stamina: rp.stamina }] };
}
