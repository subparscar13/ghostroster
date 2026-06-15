/**
 * Result-screen text + season stats. The **satirical attributed quote** (T071 /
 * D-009) is fabricated parody "in the style of" iconic, long-deceased baseball
 * figures reacting to the (obviously fictional) all-eras roster — writerly-dry,
 * praise for great seasons, a sharper deadpan sting for bad ones, never defamatory.
 *
 * Both the headline feat and the quote draw from a SPREAD of season stats (not just
 * the win streak), chosen deterministically so a given run is stable (T076).
 */

import { hashSeed } from "@/sim/rng";
import type { SeasonResult } from "@/sim/types";
import type { DraftPick } from "./types";

export type SeasonStats = {
  runsFor: number;
  runsAgainst: number;
  runDiff: number;
  teamHits: number;
  teamHR: number;
  teamAvg: string;
  shutouts: number;
  noHitters: number;
  longestWinStreak: number;
  biggestWin: string; // "16–2" (best run differential), or "—"
  biggestWinDiff: number;
};

/** Aggregate the 162-game logs into team season totals. */
export function seasonStats(result: SeasonResult): SeasonStats {
  let rf = 0;
  let ra = 0;
  let hits = 0;
  let ab = 0;
  let hr = 0;
  let shutouts = 0;
  let bestDiff = -Infinity;
  let bestLabel = "—";
  for (const g of result.gameLogs) {
    rf += g.home.runs;
    ra += g.away.runs;
    if (g.away.runs === 0) shutouts++;
    for (const b of g.batting) {
      hits += b.h;
      ab += b.pa - b.bb;
      hr += b.hr;
    }
    const diff = g.home.runs - g.away.runs;
    if (diff > bestDiff) {
      bestDiff = diff;
      bestLabel = `${g.home.runs}–${g.away.runs}`;
    }
  }
  const hasGames = result.gameLogs.length > 0;
  return {
    runsFor: rf,
    runsAgainst: ra,
    runDiff: rf - ra,
    teamHits: hits,
    teamHR: hr,
    teamAvg: ab > 0 ? (hits / ab).toFixed(3) : "0.000",
    shutouts,
    noHitters: result.highlights.noHitters, // authoritative count from the sim
    longestWinStreak: result.highlights.longestWinStreak,
    biggestWin: hasGames ? bestLabel : "—",
    biggestWinDiff: hasGames ? Math.max(0, bestDiff) : 0,
  };
}

/** Resolve the top performer's display name from the drafted picks (falls back to id). */
export function topPerformerName(result: SeasonResult, picks: DraftPick[]): string {
  const id = result.highlights.topPerformer;
  return picks.find((p) => p.playerId === id)?.name ?? id;
}

/** One headline feat — varied across qualifying season stats (no longer always the streak). */
export function primaryHighlight(result: SeasonResult): string {
  const s = seasonStats(result);
  const feats: string[] = [];
  if (s.noHitters > 0) feats.push(`${s.noHitters} no-hitter${s.noHitters > 1 ? "s" : ""}`);
  if (s.longestWinStreak >= 10) feats.push(`${s.longestWinStreak}-game win streak`);
  if (s.shutouts >= 10) feats.push(`${s.shutouts} shutouts`);
  if (s.teamHR >= 180) feats.push(`${s.teamHR} home runs`);
  if (s.biggestWinDiff >= 10) feats.push(`biggest win ${s.biggestWin}`);
  if (s.runDiff >= 200) feats.push(`+${s.runDiff} run differential`);
  if (feats.length === 0) feats.push(`${s.longestWinStreak}-game win streak`);
  return feats[hashSeed(`${result.record.w}-${result.record.l}|feat`) % feats.length]!;
}

type Ctx = SeasonStats & { w: number; l: number; top: string };
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

const RECORD: Quote[] = [
  { line: (c) => `${c.w} and ${c.l}. Good enough to brag about, not good enough to remember.`, author: "Red Barber" },
  { line: (c) => `${c.w} wins. Respectable. Forgettable. File it under "pretty good."`, author: "Grantland Rice" },
  { line: (c) => `${c.w} and ${c.l} — above water, below legend, the honest middle.`, author: "Grantland Rice" },
  { line: (c) => `A ${c.w}-win year carried by ${c.top}; a trivia answer by August.`, author: "Ring Lardner" },
  { line: () => "A winning record stitched from strangers across the eras. Pleasant enough.", author: "Red Barber" },
];

const STREAK: Quote[] = [
  { line: (c) => `${c.longestWinStreak} straight. Around game thirty the other dugouts started booking dentist appointments.`, author: "Mel Allen" },
  { line: (c) => `A ${c.longestWinStreak}-game winning streak. I've seen weather systems with less momentum.`, author: "Harry Caray" },
  { line: (c) => `Won ${c.longestWinStreak} in a row, at which point the schedule stopped being a contest.`, author: "Grantland Rice" },
];

const NO_HITTERS: Quote[] = [
  { line: (c) => `${c.noHitters} no-hitters. The opposing bats have been listed as missing.`, author: "Red Barber" },
  { line: (c) => `${c.noHitters} games without surrendering a hit. Somebody call their families.`, author: "Dizzy Dean" },
  { line: (c) => `${c.noHitters} no-hitters against men dead for decades. Twice the indignity.`, author: "Ring Lardner" },
];

const SLUGGING: Quote[] = [
  { line: (c) => `${c.teamHR} home runs. The groundskeepers filed for hazard pay.`, author: "Mel Allen" },
  { line: (c) => `${c.runsFor} runs scored. Arithmetic stopped being relevant around June.`, author: "Grantland Rice" },
  { line: (c) => `${c.teamHR} long balls from men who never met. Physics took the year off.`, author: "Ring Lardner" },
];

const PITCHING: Quote[] = [
  { line: (c) => `${c.shutouts} shutouts. The other dugout brought bats out of habit, not hope.`, author: "Red Barber" },
  { line: (c) => `${c.runsAgainst} runs allowed all year. Stingy doesn't begin to cover it.`, author: "Mel Allen" },
  { line: (c) => `${c.shutouts} times the opposition went home with nothing. Cruel and efficient.`, author: "Ring Lardner" },
];

const BLOWOUT: Quote[] = [
  { line: (c) => `One afternoon they won ${c.biggestWin}. It stopped being baseball and became a lesson.`, author: "Grantland Rice" },
  { line: (c) => `A ${c.biggestWin} final in there somewhere — the mercy rule was written for days like it.`, author: "Harry Caray" },
];

const POOR: Quote[] = [
  { line: (c) => `A lineup of immortals that lost ${c.l} times. Even the ghosts left early.`, author: "Ring Lardner" },
  { line: (c) => `${c.w} and ${c.l}. Eighty years of talent, and somehow none of it showed up.`, author: "Grantland Rice" },
  { line: () => "It takes genuine coordination across the decades to be this bad. Almost admirable.", author: "Ring Lardner" },
  { line: (c) => `${c.l} losses. I've run clubs that quit earlier and embarrassed me less.`, author: "Casey Stengel" },
  { line: (c) => `${c.top} did what he could. The other twelve treated the season as optional.`, author: "Mel Allen" },
];

function choose(pool: Quote[], c: Ctx, salt: string): { quote: string; author: string } {
  const q = pool[hashSeed(`${c.w}-${c.l}|${salt}`) % pool.length]!;
  return { quote: q.line(c), author: q.author };
}

/** A deterministic satirical quote. Anchors on the record at the extremes; in the broad
 * middle it rotates among whichever season stats are notable, so it isn't always the streak. */
export function quip(result: SeasonResult, picks: DraftPick[]): { quote: string; author: string } {
  const s = seasonStats(result);
  const c: Ctx = { ...s, w: result.record.w, l: result.record.l, top: topPerformerName(result, picks) };

  if (c.l === 0) return choose(PERFECT, c, "perfect");
  if (c.l <= 4) return choose(NEAR_MISS, c, "near");
  if (c.w < 70) return choose(POOR, c, "poor");

  // Middle: RECORD is always eligible; add flavor pools for whatever stands out.
  const pools: [string, Quote[]][] = [["record", RECORD]];
  if (c.noHitters >= 1) pools.push(["nohit", NO_HITTERS]);
  if (c.longestWinStreak >= 18) pools.push(["streak", STREAK]);
  if (c.teamHR >= 200) pools.push(["slug", SLUGGING]);
  if (c.shutouts >= 15) pools.push(["pitch", PITCHING]);
  if (c.biggestWinDiff >= 14) pools.push(["blow", BLOWOUT]);

  const [salt, pool] = pools[hashSeed(`${c.w}-${c.l}|pool`) % pools.length]!;
  return choose(pool, c, salt);
}
