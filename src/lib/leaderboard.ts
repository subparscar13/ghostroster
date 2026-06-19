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

/** Exactly three letters → uppercased; otherwise null (the arcade rule). */
export function validateInitials(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : null;
}

export type Submission = {
  dateKey: string;
  initials: string;
  deviceId: string;
  wins: number;
  losses: number;
  runDiff: number;
  grade: string;
  squares: string;
  division: string;
};

/** The POST body for a daily result. No roster — we trust the score. */
export function buildSubmission(dateKey: string, initials: string, result: SeasonResult): Submission {
  const s = seasonStats(result);
  return {
    dateKey,
    initials,
    deviceId: getDeviceId(),
    wins: result.record.w,
    losses: result.record.l,
    runDiff: s.runDiff,
    grade: result.grade,
    squares: spoilerSquares(result),
    division: dailyThemeName(dateKey),
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
export async function fetchBoard(scope: BoardScope, dateKey?: string): Promise<BoardRow[]> {
  if (!LEADERBOARD_ENDPOINT) return [];
  const url = new URL(`${LEADERBOARD_ENDPOINT}/board`);
  url.searchParams.set("scope", scope);
  if (dateKey) url.searchParams.set("date", dateKey);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`board request failed (${res.status})`);
  const data = (await res.json()) as { rows?: BoardRow[] };
  return data.rows ?? [];
}
