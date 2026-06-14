/**
 * Daily challenge (T052/T053). Everything is derived from the calendar date so every
 * player gets the same spins + same sim seed that day (constitution II: the sim still
 * receives a plain seed number — only this app layer reads the wall clock). Replay is
 * allowed (operator decision), so there is no one-attempt lock. The share output is
 * spoiler-safe: record + grade + emoji squares, no roster (T053).
 */

import { hashSeed, mulberry32 } from "@/sim/rng";
import type { Rng } from "@/sim/rng";
import type { SeasonResult } from "@/sim/types";

const SALT = "ghostroster";
const EPOCH_UTC = Date.UTC(2026, 5, 1); // 2026-06-01 → "Ghost Roster #1"
const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD. */
export function dailyDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "Ghost Roster #N" number — days since the launch epoch. */
export function dailyNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const t = Date.UTC(y!, (m! - 1), d!);
  return Math.floor((t - EPOCH_UTC) / DAY_MS) + 1;
}

/** The season seed for the day — identical for everyone. */
export function dailySeed(dateKey: string): number {
  return hashSeed(`${SALT}|${dateKey}|season`);
}

/** A fresh seeded RNG for one deterministic spin event (round + event key), so the
 * spin sequence and re-rolls are identical for all players that day. */
export function dailyRng(dateKey: string, key: string): Rng {
  return mulberry32(hashSeed(`${SALT}|${dateKey}|${key}`));
}

/** 18 emoji squares (one per 9-game stretch): 🟩 dominant, 🟨 winning-ish, 🟥 rough. */
export function spoilerSquares(result: SeasonResult): string {
  const logs = result.gameLogs;
  const bucket = 9;
  const squares: string[] = [];
  for (let i = 0; i < logs.length; i += bucket) {
    const wins = logs.slice(i, i + bucket).filter((g) => g.win).length;
    squares.push(wins >= 8 ? "🟩" : wins >= 5 ? "🟨" : "🟥");
  }
  // group into rows of 6 for a compact block
  const rows: string[] = [];
  for (let i = 0; i < squares.length; i += 6) rows.push(squares.slice(i, i + 6).join(""));
  return rows.join("\n");
}

/** Spoiler-safe share text: record + grade + squares, no roster reveal. */
export function dailyShareText(dateKey: string, result: SeasonResult): string {
  return [
    `Ghost Roster #${dailyNumber(dateKey)}`,
    `${result.record.w}-${result.record.l} · ${result.grade}`,
    spoilerSquares(result),
    "ghostroster.app",
  ].join("\n");
}

/** Share the spoiler-safe text natively, else copy to clipboard. */
export async function shareDaily(text: string): Promise<"shared" | "copied" | "failed"> {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ text });
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "shared";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
