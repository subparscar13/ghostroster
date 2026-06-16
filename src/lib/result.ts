/**
 * Result-screen text + season stats. The **satirical attributed quote** (T071 /
 * D-009, broadcaster voices added in T078) is fabricated parody "in the style of"
 * iconic baseball figures — writers (Lardner, Rice), broadcasters (Scully, Jack
 * Buck, Harry Caray, Bob Uecker, Red Barber, Mel Allen), and players/managers
 * (Ruth, Dean, Paige, Stengel) — reacting to the (obviously fictional) all-eras
 * roster. Praise for great seasons, a sharper deadpan sting for bad ones; each
 * voice keeps its register; never defamatory (always aimed at the team/season).
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
  worstLoss: string; // "1–9" (worst run differential), or "—"
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
  let worstDiff = Infinity;
  let worstLabel = "—";
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
    if (diff < worstDiff) {
      worstDiff = diff;
      worstLabel = `${g.home.runs}–${g.away.runs}`;
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
    worstLoss: hasGames ? worstLabel : "—",
  };
}

/** Resolve the top performer's display name from the drafted picks (falls back to id). */
export function topPerformerName(result: SeasonResult, picks: DraftPick[]): string {
  const id = result.highlights.topPerformer;
  return picks.find((p) => p.playerId === id)?.name ?? id;
}

export type HitterLine = {
  playerId: string;
  name: string;
  pa: number;
  ab: number;
  h: number;
  b2: number;
  b3: number;
  hr: number;
  bb: number;
  rbi: number;
  r: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
};

export type PitcherLine = {
  playerId: string;
  name: string;
  role: "SP" | "RP";
  gs: number; // games started (0 for the reliever)
  g: number; // appearances
  ip: number; // innings pitched (whole — the sim has no partial innings)
  r: number; // runs allowed (all earned; no errors modeled)
  era: number;
};

export type PlayerStats = { hitters: HitterLine[]; pitchers: PitcherLine[] };

const ROTATION_SLOTS = ["SP1", "SP2", "SP3"] as const;

/**
 * Per-player season lines (T080) for the box-score "Season stats" view.
 *
 * Hitters are exact: the sim logs a real BattingLine per slot each game, so we sum
 * them into a full slash line (AB = PA − BB; the sim folds HBP/SF into BB and models
 * no SF, so AB is clean). Pitchers are exact too: each game records the innings +
 * runs charged to its starter vs. reliever (`GameLog.pitching`), and the rotation is
 * deterministic (starter = (game−1) % rotation length), so we attribute the split to
 * the right arm. K/W–L aren't tracked (outs are generic; decisions aren't recorded)
 * so they're omitted.
 */
export function playerSeasonStats(result: SeasonResult, picks: DraftPick[]): PlayerStats {
  const nameOf = (id: string) => picks.find((p) => p.playerId === id)?.name ?? id;

  // Hitters — accumulate by playerId, preserving the batting order from game 1.
  type Agg = { pa: number; h: number; b2: number; b3: number; hr: number; bb: number; rbi: number; r: number };
  const fresh = (): Agg => ({ pa: 0, h: 0, b2: 0, b3: 0, hr: 0, bb: 0, rbi: 0, r: 0 });
  const order: string[] = [];
  const acc = new Map<string, Agg>();
  for (const g of result.gameLogs) {
    for (const b of g.batting) {
      let a = acc.get(b.playerId);
      if (!a) {
        a = fresh();
        acc.set(b.playerId, a);
        order.push(b.playerId);
      }
      a.pa += b.pa;
      a.h += b.h;
      a.b2 += b.b2;
      a.b3 += b.b3;
      a.hr += b.hr;
      a.bb += b.bb;
      a.rbi += b.rbi;
      a.r += b.r;
    }
  }
  const hitters: HitterLine[] = order.map((id) => {
    const a = acc.get(id)!;
    const ab = a.pa - a.bb;
    const tb = a.h - a.b2 - a.b3 - a.hr + 2 * a.b2 + 3 * a.b3 + 4 * a.hr;
    const avg = ab > 0 ? a.h / ab : 0;
    const obp = a.pa > 0 ? (a.h + a.bb) / a.pa : 0;
    const slg = ab > 0 ? tb / ab : 0;
    return { playerId: id, name: nameOf(id), pa: a.pa, ab, h: a.h, b2: a.b2, b3: a.b3, hr: a.hr, bb: a.bb, rbi: a.rbi, r: a.r, avg, obp, slg, ops: obp + slg };
  });

  // Pitchers — attribute each game's recorded starter/reliever split to the right arm
  // (rotation is deterministic: starter = (game-1) % rotation length).
  const rotation = ROTATION_SLOTS.map((s) => picks.find((p) => p.slot === s)).filter((p): p is DraftPick => p != null);
  const rpPick = picks.find((p) => p.slot === "RP");
  const spAgg = rotation.map(() => ({ gs: 0, ip: 0, r: 0 }));
  const rp = { g: 0, ip: 0, r: 0 };
  if (rotation.length > 0) {
    for (const g of result.gameLogs) {
      const si = (g.game - 1) % rotation.length;
      spAgg[si]!.gs += 1;
      spAgg[si]!.ip += g.pitching.spIp;
      spAgg[si]!.r += g.pitching.spR;
      if (g.pitching.rpIp > 0) rp.g += 1; // the reliever sits out complete-game no-hitters
      rp.ip += g.pitching.rpIp;
      rp.r += g.pitching.rpR;
    }
  }
  const era = (r: number, ip: number) => (ip > 0 ? (r * 9) / ip : 0);
  const pitchers: PitcherLine[] = rotation.map((p, i) => ({
    playerId: p.playerId,
    name: p.name,
    role: "SP",
    gs: spAgg[i]!.gs,
    g: spAgg[i]!.gs,
    ip: spAgg[i]!.ip,
    r: spAgg[i]!.r,
    era: era(spAgg[i]!.r, spAgg[i]!.ip),
  }));
  if (rpPick) pitchers.push({ playerId: rpPick.playerId, name: rpPick.name, role: "RP", gs: 0, g: rp.g, ip: rp.ip, r: rp.r, era: era(rp.r, rp.ip) });

  return { hitters, pitchers };
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
  { line: () => "In a sport built on failure, a whole season without it. Pull up a chair — you may never see this again.", author: "Vin Scully" },
  { line: () => "162 and 0. I don't believe what I just saw, and I watched every inning of it.", author: "Jack Buck" },
  { line: () => "A perfect season — holy cow. And not one of these fellas still around to buy a round.", author: "Harry Caray" },
  { line: () => "A flawless season assembled from men who never shared a clubhouse, a century, or a handshake. Tidy.", author: "Red Barber" },
  { line: () => "Perfect, they tell me. I went a whole season without a perfect anything. Different skill set.", author: "Bob Uecker" },
  { line: () => "162 and 0. I've made outs that took longer than your whole losing column.", author: "Babe Ruth" },
  { line: () => "162-0. Even the ghosts started looking over their shoulders.", author: "Satchel Paige" },
];

const NEAR_MISS: Quote[] = [
  { line: (c) => `${c.l} small clouds in an otherwise blue season — the pulse of this game is failure, and they felt it only ${c.l} times.`, author: "Vin Scully" },
  { line: (c) => `${c.l} losses. That's a winner, folks — just not a perfect one.`, author: "Jack Buck" },
  { line: (c) => `${c.l} losses shy of perfect. In my day that was a career year.`, author: "Bob Uecker" },
  { line: (c) => `${c.l} losses. Give it a hundred years and the record books will round them down.`, author: "Grantland Rice" },
  { line: (c) => `So close to perfect you can hear it — ${c.l} blemishes on a season that didn't deserve them.`, author: "Red Barber" },
  { line: (c) => `${c.l} games got away. The other ${c.w} didn't have the nerve.`, author: "Mel Allen" },
];

const RECORD: Quote[] = [
  { line: (c) => `${c.w} and ${c.l} — a pleasant afternoon's work, the kind you've forgotten by the drive home.`, author: "Vin Scully" },
  { line: (c) => `${c.w} and ${c.l}. Good seats still available to watch a team this gloriously average.`, author: "Bob Uecker" },
  { line: (c) => `${c.w} and ${c.l}. A winner, sure. We'll leave the fireworks in the box for now.`, author: "Jack Buck" },
  { line: (c) => `${c.w} wins — holy cow. Well, holy small cow. We'll take it.`, author: "Harry Caray" },
  { line: (c) => `${c.w} and ${c.l}. Good enough to brag about, not good enough to remember.`, author: "Red Barber" },
  { line: (c) => `${c.w} wins. Respectable. Forgettable. File it under "pretty good."`, author: "Grantland Rice" },
  { line: (c) => `A ${c.w}-win year carried by ${c.top}; a trivia answer by August.`, author: "Ring Lardner" },
];

const STREAK: Quote[] = [
  { line: (c) => `${c.longestWinStreak} in a row. In a quiet way, the rest of the league simply ran out of arguments.`, author: "Vin Scully" },
  { line: (c) => `${c.longestWinStreak} straight — holy cow, you could've batted the order backwards and still won.`, author: "Harry Caray" },
  { line: (c) => `${c.longestWinStreak} in a row, and somewhere in the middle of it I stopped believing what I saw.`, author: "Jack Buck" },
  { line: (c) => `${c.longestWinStreak} straight. Around game thirty the other dugouts started booking dentist appointments.`, author: "Mel Allen" },
];

const NO_HITTERS: Quote[] = [
  { line: (c) => `${c.noHitters} no-hitters. The opposing bats have been listed as missing.`, author: "Red Barber" },
  { line: (c) => `${c.noHitters} no-hitters. I went hitless plenty — never on purpose, mind you.`, author: "Bob Uecker" },
  { line: (c) => `${c.noHitters} times the other side went home without a hit, and without a word.`, author: "Vin Scully" },
  { line: (c) => `${c.noHitters} games without surrendering a hit. Somebody call their families.`, author: "Dizzy Dean" },
];

const SLUGGING: Quote[] = [
  { line: (c) => `${c.teamHR} home runs — holy cow, somebody warn the bleachers and the neighborhood behind them.`, author: "Harry Caray" },
  { line: (c) => `${c.runsFor} runs. Go crazy, folks — the arithmetic certainly did.`, author: "Jack Buck" },
  { line: (c) => `${c.teamHR} home runs. The groundskeepers filed for hazard pay.`, author: "Mel Allen" },
  { line: (c) => `${c.teamHR} long balls from men who never met. Physics took the year off.`, author: "Ring Lardner" },
];

const PITCHING: Quote[] = [
  { line: (c) => `${c.shutouts} nights the scoreboard never blinked. Pitching, it's been said, is the art of the unkind.`, author: "Vin Scully" },
  { line: (c) => `${c.runsAgainst} runs allowed all year. Even I could've gotten into a few of those games — front row, mind you.`, author: "Bob Uecker" },
  { line: (c) => `${c.shutouts} shutouts. The other dugout brought bats out of habit, not hope.`, author: "Red Barber" },
  { line: (c) => `${c.runsAgainst} runs allowed all year. Stingy doesn't begin to cover it.`, author: "Mel Allen" },
];

const BLOWOUT: Quote[] = [
  { line: (c) => `They won ${c.biggestWin}. Go crazy if you like — the scoreboard already did.`, author: "Jack Buck" },
  { line: (c) => `A ${c.biggestWin} final in there somewhere — holy cow, the mercy rule was written for days like it.`, author: "Harry Caray" },
  { line: (c) => `One afternoon they won ${c.biggestWin}. It stopped being baseball and became a lesson.`, author: "Grantland Rice" },
];

const POOR: Quote[] = [
  { line: (c) => `${c.l} losses. I caught for some bad clubs. This one would've fit right in.`, author: "Bob Uecker" },
  { line: (c) => `${c.w} and ${c.l} — holy cow, and not the good kind of holy cow.`, author: "Harry Caray" },
  { line: (c) => `A lineup of immortals that lost ${c.l} times. Even the ghosts left early.`, author: "Ring Lardner" },
  { line: (c) => `${c.l} losses. I've run clubs that quit earlier and embarrassed me less.`, author: "Casey Stengel" },
  { line: (c) => `${c.w} and ${c.l}. Eighty years of talent, and somehow none of it showed up.`, author: "Grantland Rice" },
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
  // Thresholds kept modest so a typical season usually surfaces at least one flavor
  // pool — that keeps the attributed voices varied rather than leaning on RECORD.
  const pools: [string, Quote[]][] = [["record", RECORD]];
  if (c.noHitters >= 1) pools.push(["nohit", NO_HITTERS]);
  if (c.longestWinStreak >= 15) pools.push(["streak", STREAK]);
  if (c.teamHR >= 185) pools.push(["slug", SLUGGING]);
  if (c.shutouts >= 12) pools.push(["pitch", PITCHING]);
  if (c.biggestWinDiff >= 12) pools.push(["blow", BLOWOUT]);

  const [salt, pool] = pools[hashSeed(`${c.w}-${c.l}|pool`) % pools.length]!;
  return choose(pool, c, salt);
}
