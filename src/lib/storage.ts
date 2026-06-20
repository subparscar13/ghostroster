/**
 * In-progress run persistence (T042) + daily result history (T052). Runs survive a
 * reload via localStorage so progress is never silently lost. Classic and daily runs
 * use separate keys so they don't clobber each other. SSR-safe: every access guards
 * `window`.
 */

import type { DraftPick } from "./types";

export type RunMode = "classic" | "daily";

const runKey = (mode: RunMode) => `ghostroster:run:${mode}:v1`;
const DAILY_KEY = "ghostroster:daily:v1";

export type PersistedRun = {
  rerollsUsed: { team: number; era: number };
  picks: DraftPick[];
  seed?: number; // season seed (set once the draft completes; fixed up-front for daily)
  reloads?: number; // classic only: mid-draft resumes (each re-spins the current slot = a free re-roll); flags the score with an asterisk (D-012)
};

export function saveRun(mode: RunMode, run: PersistedRun): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(runKey(mode), JSON.stringify(run));
  } catch {
    // storage full / disabled — non-fatal; the run just won't resume.
  }
}

export function loadRun(mode: RunMode): PersistedRun | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(runKey(mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedRun;
    if (!Array.isArray(parsed.picks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRun(mode: RunMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(runKey(mode));
  } catch {
    // ignore
  }
}

export type DailyResult = { record: string; grade: string; squares: string; playedAt: string };
export type DailyHistory = Record<string, DailyResult>;

export function loadDailyHistory(): DailyHistory {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(DAILY_KEY) ?? "{}") as DailyHistory;
  } catch {
    return {};
  }
}

export function saveDailyResult(dateKey: string, result: DailyResult): void {
  if (typeof window === "undefined") return;
  try {
    const history = loadDailyHistory();
    history[dateKey] = result;
    window.localStorage.setItem(DAILY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}
