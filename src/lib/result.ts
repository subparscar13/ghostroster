/**
 * Result-screen text: one season-highlight beat and one **satirical attributed
 * quote** (T071 / D-009). Quotes are fabricated parody "in the style of" iconic,
 * long-deceased baseball figures reacting to the player's (obviously fictional)
 * all-eras roster — writerly-dry, praise for great seasons, a sharper deadpan sting
 * for bad ones, always aimed at the team/season (never defamatory). Selection is
 * deterministic from the result, so a given run always shows the same quote.
 */

import { hashSeed } from "@/sim/rng";
import type { SeasonResult } from "@/sim/types";
import type { DraftPick } from "./types";

/** One headline highlight beat. */
export function primaryHighlight(result: SeasonResult): string {
  const h = result.highlights;
  if (h.noHitters > 0) return `${h.noHitters} no-hitter${h.noHitters > 1 ? "s" : ""} thrown`;
  return `Longest win streak: ${h.longestWinStreak}`;
}

/** Resolve the top performer's display name from the drafted picks (falls back to id). */
export function topPerformerName(result: SeasonResult, picks: DraftPick[]): string {
  const id = result.highlights.topPerformer;
  return picks.find((p) => p.playerId === id)?.name ?? id;
}

type Ctx = { w: number; l: number; streak: number; noHitters: number; top: string };
type Quote = { line: (c: Ctx) => string; author: string };

const PERFECT: Quote[] = [
  { line: () => "Perfection is boring to watch and a nightmare to write. You did it anyway.", author: "Ring Lardner" },
  { line: () => "A flawless season assembled from men who never shared a clubhouse, a century, or a handshake. Tidy.", author: "Red Barber" },
  { line: () => "162 and 0. I've made outs that took longer than your whole losing column.", author: "Babe Ruth" },
  { line: () => "They keep saying nobody's perfect. This lot went and embarrassed the saying.", author: "Dizzy Dean" },
  { line: () => "A perfect record, and not one of these men alive to enjoy it. Baseball's funny that way.", author: "Grantland Rice" },
  { line: () => "162-0. Even the ghosts started looking over their shoulders.", author: "Satchel Paige" },
];

const NEAR_MISS: Quote[] = [
  { line: (c) => `${c.l} losses. Give it a hundred years and the record books will round them down.`, author: "Grantland Rice" },
  { line: (c) => `${c.l} games got away. The other ${c.w} didn't have the nerve.`, author: "Mel Allen" },
  { line: (c) => `So close to perfect you can hear it — ${c.l} blemishes on a season that didn't deserve them.`, author: "Red Barber" },
  { line: (c) => `Lost ${c.l}, and somewhere a scorekeeper is still apologizing.`, author: "Ring Lardner" },
];

const NO_HITTERS: Quote[] = [
  { line: (c) => `${c.noHitters} no-hitters. The opposing bats have been listed as missing.`, author: "Red Barber" },
  { line: (c) => `${c.noHitters} games without surrendering a hit. Somebody call their families.`, author: "Dizzy Dean" },
  { line: (c) => `${c.noHitters} no-hitters against men dead for decades. Twice the indignity.`, author: "Ring Lardner" },
];

const STREAK: Quote[] = [
  { line: (c) => `${c.streak} straight. Around game thirty the other dugouts started booking dentist appointments.`, author: "Mel Allen" },
  { line: (c) => `A ${c.streak}-game winning streak. I've seen weather systems with less momentum.`, author: "Harry Caray" },
  { line: (c) => `Won ${c.streak} in a row, at which point the schedule stopped being a contest.`, author: "Grantland Rice" },
];

const HUNDRED: Quote[] = [
  { line: (c) => `${c.w} wins. Respectable. Forgettable. File it under "pretty good."`, author: "Grantland Rice" },
  { line: (c) => `A hundred-win year carried by ${c.top}, and still a trivia answer by August.`, author: "Ring Lardner" },
  { line: (c) => `${c.w} and ${c.l}. Good enough to brag about, not good enough to remember.`, author: "Red Barber" },
];

const WINNING: Quote[] = [
  { line: (c) => `${c.w} and ${c.l}. Above water, below legend — the honest middle.`, author: "Grantland Rice" },
  { line: () => "A winning record stitched from strangers across the eras. Pleasant enough.", author: "Red Barber" },
  { line: (c) => `${c.w} wins. Your grandkids will round it up; the record book won't.`, author: "Ring Lardner" },
];

const POOR: Quote[] = [
  { line: (c) => `A lineup of immortals that lost ${c.l} times. Even the ghosts left early.`, author: "Ring Lardner" },
  { line: (c) => `${c.w} and ${c.l}. Eighty years of talent, and somehow none of it showed up.`, author: "Grantland Rice" },
  { line: () => "It takes genuine coordination across the decades to be this bad. Almost admirable.", author: "Ring Lardner" },
  { line: (c) => `${c.l} losses. I've run clubs that quit earlier and embarrassed me less.`, author: "Casey Stengel" },
  { line: (c) => `${c.top} did what he could. The other twelve treated the season as optional.`, author: "Mel Allen" },
];

function poolFor(c: Ctx): Quote[] {
  if (c.l === 0) return PERFECT;
  if (c.l <= 4) return NEAR_MISS;
  if (c.noHitters >= 2) return NO_HITTERS;
  if (c.streak >= 20) return STREAK;
  if (c.w >= 100) return HUNDRED;
  if (c.w >= 82) return WINNING;
  return POOR;
}

/** A deterministic satirical quote for the season, with its (parody) attribution. */
export function quip(result: SeasonResult, picks: DraftPick[]): { quote: string; author: string } {
  const c: Ctx = {
    w: result.record.w,
    l: result.record.l,
    streak: result.highlights.longestWinStreak,
    noHitters: result.highlights.noHitters,
    top: topPerformerName(result, picks),
  };
  const pool = poolFor(c);
  const pick = pool[hashSeed(`${c.w}-${c.l}|${c.streak}|${c.noHitters}`) % pool.length]!;
  return { quote: pick.line(c), author: pick.author };
}
