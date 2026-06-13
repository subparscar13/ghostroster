/**
 * In-progress run persistence (T042). The run survives a reload via localStorage so
 * progress is never silently lost (spec edge case). Daily history (M4) uses a
 * separate key. SSR-safe: every access guards `window`.
 */

import type { DraftPick } from "./types";

const RUN_KEY = "ghostroster:run:v1";

export type PersistedRun = {
  rerollsUsed: { team: number; era: number };
  picks: DraftPick[];
  seed?: number; // the season seed, set once the draft completes (reproducible result)
};

export function saveRun(run: PersistedRun): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RUN_KEY, JSON.stringify(run));
  } catch {
    // storage full / disabled — non-fatal; the run just won't resume.
  }
}

export function loadRun(): PersistedRun | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedRun;
    if (!Array.isArray(parsed.picks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRun(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RUN_KEY);
  } catch {
    // ignore
  }
}
