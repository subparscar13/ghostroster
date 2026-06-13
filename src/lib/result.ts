/**
 * Pure result-screen text: one season-highlight beat and one generated quip
 * (T045). Both deterministic from the SeasonResult so the result screen is stable.
 * The quip is cut-order item #2 — kept small and template-based on purpose.
 */

import type { SeasonResult } from "@/sim/types";
import type { DraftPick } from "./types";

/** One headline highlight beat. */
export function primaryHighlight(result: SeasonResult): string {
  const h = result.highlights;
  if (h.noHitters > 0) return `${h.noHitters} no-hitter${h.noHitters > 1 ? "s" : ""} thrown`;
  return `Longest win streak: ${h.longestWinStreak}`;
}

/** One generated quip, chosen deterministically from the record + highlights. */
export function quip(result: SeasonResult): string {
  const { w, l } = result.record;
  const h = result.highlights;
  if (l === 0) return "Perfection. Nobody left a ghost on base all year.";
  if (l <= 4) return `So close you could taste it — ${l} that got away.`;
  if (h.noHitters >= 3) return `${h.noHitters} no-hitters. The other bats stayed home.`;
  if (h.longestWinStreak >= 20) return `A ${h.longestWinStreak}-game tear carried the whole club.`;
  if (w >= 100) return "A hundred wins and a season worth arguing about.";
  if (w >= 81) return "Above .500, short of the ghosts' best.";
  return "Some seasons are just for building character.";
}

/** Resolve the top performer's display name from the drafted picks (falls back to id). */
export function topPerformerName(result: SeasonResult, picks: DraftPick[]): string {
  const id = result.highlights.topPerformer;
  return picks.find((p) => p.playerId === id)?.name ?? id;
}
