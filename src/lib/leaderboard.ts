/**
 * Arcade leaderboard client (D-012). Env-gated exactly like Analytics/CommentBox: inert
 * until `NEXT_PUBLIC_LEADERBOARD_ENDPOINT` (a Cloudflare Worker URL) is set at build time,
 * so when it's unset every leaderboard entry point renders nothing and the app is
 * byte-for-byte today's app.
 *
 * Identity is arcade-style: 3 initials shown publicly + an anonymous per-device id (no
 * login). We **trust the submitted score** — no roster is sent or stored (simplest; a
 * friends board). The pure helpers here are unit-tested; the fetch wrappers talk to the
 * Worker.
 */

import type { SeasonResult } from "@/sim/types";
import { spoilerSquares } from "./daily";
import { dailyThemeName } from "./divisions";
import { seasonStats } from "./result";
import type { DraftPick } from "./types";

export const LEADERBOARD_ENDPOINT = process.env.NEXT_PUBLIC_LEADERBOARD_ENDPOINT;
export const leaderboardEnabled = (): boolean => Boolean(LEADERBOARD_ENDPOINT);

const DEVICE_KEY = "ghostroster:device:v1";
const INITIALS_KEY = "ghostroster:initials:v1";

/** A stable anonymous id for this browser (attributes weekly/all-time without a login). */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = window.crypto?.randomUUID?.() ?? `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function loadInitials(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(INITIALS_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveInitials(initials: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INITIALS_KEY, initials);
  } catch {
    // ignore
  }
}

/** 1–10 letters/digits → uppercased; otherwise null. */
export function validateName(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  return /^[A-Z0-9]{1,10}$/.test(s) ? s : null;
}

export type BoardMode = "daily" | "classic";

const SUBMITTED_KEY = "ghostroster:submitted:v1";
const SUBMITTED_MAX = 50;

/** A stable id for one playable run, so the post prompt knows whether it's already been
 * posted. Daily = one per date (the daily is replayable but the same challenge); classic =
 * one per seed (a "New run" gets a new seed → a fresh prompt). */
export function submittedKey(mode: BoardMode, dateKey: string, seed?: number): string {
  return mode === "daily" ? `daily:${dateKey}` : `classic:${seed ?? dateKey}`;
}

function readSubmitted(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SUBMITTED_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Has this run already been posted from this device? (Suppresses the re-prompt on replays.) */
export function hasSubmitted(key: string): boolean {
  return readSubmitted().includes(key);
}

/** Record that this run was posted. Bounded (keeps the most recent entries). Never throws. */
export function markSubmitted(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = [...readSubmitted().filter((k) => k !== key), key].slice(-SUBMITTED_MAX);
    window.localStorage.setItem(SUBMITTED_KEY, JSON.stringify(next));
  } catch {
    // best-effort suppression — ignore
  }
}

/** A pick reduced to what the server needs to re-verify: who, where they slot, and the
 * authoritative data chunk to pull their real vector from (never the vector itself). */
export type SubmissionPick = { playerId: string; slot: string; chunk: string };

export type Submission = {
  mode: BoardMode;
  dateKey: string;
  initials: string;
  deviceId: string;
  wins: number;
  losses: number;
  runDiff: number;
  grade: string;
  squares: string;
  division: string;
  picks: SubmissionPick[];
  seed?: number; // classic only — the run's seed, so the Worker can replay it (daily derives the seed from the date)
};

/** The POST body for a result. Includes the roster as `(playerId, slot, chunk)` so the
 * Worker can rebuild it from authoritative data and re-simulate high claims (D-012) — no
 * vectors are sent, so a tampered roster can't pass. Classic runs also send their `seed`
 * (the daily derives its seed from the date). */
export function buildSubmission(
  mode: BoardMode,
  dateKey: string,
  initials: string,
  result: SeasonResult,
  picks: DraftPick[],
  seed?: number,
): Submission {
  const s = seasonStats(result);
  return {
    mode,
    dateKey,
    initials,
    deviceId: getDeviceId(),
    wins: result.record.w,
    losses: result.record.l,
    runDiff: s.runDiff,
    grade: result.grade,
    squares: spoilerSquares(result),
    division: mode === "daily" ? dailyThemeName(dateKey) : "Classic",
    picks: picks.map((p) => ({ playerId: p.playerId, slot: p.slot, chunk: p.chunk ?? "" })),
    ...(mode === "classic" && seed != null ? { seed } : {}),
  };
}

export async function submitScore(sub: Submission): Promise<"ok" | "error"> {
  if (!LEADERBOARD_ENDPOINT) return "error";
  try {
    const res = await fetch(`${LEADERBOARD_ENDPOINT}/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(sub),
    });
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

/** Bump the global "rosters built" counter. Fire-and-forget; never throws. */
export async function recordRosterBuilt(): Promise<void> {
  if (!LEADERBOARD_ENDPOINT) return;
  try {
    await fetch(`${LEADERBOARD_ENDPOINT}/built`, { method: "POST" });
  } catch {
    // best-effort vanity counter — ignore failures
  }
}

/** Read the global "rosters built" count, or null if unavailable. */
export async function fetchRosterCount(): Promise<number | null> {
  if (!LEADERBOARD_ENDPOINT) return null;
  try {
    const res = await fetch(`${LEADERBOARD_ENDPOINT}/count`);
    if (!res.ok) return null;
    const data = (await res.json()) as { count?: number };
    return typeof data.count === "number" ? data.count : null;
  } catch {
    return null;
  }
}

export type BoardScope = "daily" | "weekly" | "alltime";
export type BoardRow = {
  rank: number;
  initials: string;
  wins: number;
  losses: number;
  grade: string;
  division?: string;
  dateKey?: string;
  perfectCount?: number; // all-time only: number of 162-0 days
};

/** Fetch a board. Throws on a network/HTTP error so the page can show an error state. */
export async function fetchBoard(scope: BoardScope, mode: BoardMode, dateKey?: string): Promise<BoardRow[]> {
  if (!LEADERBOARD_ENDPOINT) return [];
  const url = new URL(`${LEADERBOARD_ENDPOINT}/board`);
  url.searchParams.set("scope", scope);
  url.searchParams.set("mode", mode);
  if (dateKey) url.searchParams.set("date", dateKey);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`board request failed (${res.status})`);
  const data = (await res.json()) as { rows?: BoardRow[] };
  return data.rows ?? [];
}
