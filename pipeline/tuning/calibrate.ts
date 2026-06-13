/**
 * T038 — sim calibration harness (TypeScript, run under Node).
 *
 * Loads the real committed `public/data` chunks, builds representative rosters, runs
 * many seasons through the pure sim, and reports the three SC-004 targets:
 *   1. an all-era-average roster's run environment vs the neutral baseline (±10%),
 *   2. 10K optimal-play (best-possible) seasons → top ~1–3% reach 162-0,
 *   3. great-but-flawed (random strong drafts) land in the 145–158 win band.
 *
 * This is an OFFLINE tool — file I/O here is fine; the sim it calls stays pure and
 * seeded. It is the single source of truth (it runs the exact shipped sim), so the
 * calibration can never drift from gameplay. Output: a markdown report + JSON next
 * to this file. Run: `npx tsx ...` or `node pipeline/tuning/calibrate.ts`.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { LEAGUE_AVERAGE_OPPONENT, NEUTRAL } from "../../src/sim/baseline.ts";
import { mulberry32 } from "../../src/sim/rng.ts";
import { simulateSeason } from "../../src/sim/season.ts";
import type { Hitter, OutcomeVector, Pitcher, Roster } from "../../src/sim/types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "..", "..", "public", "data");

// Linear-weights value per PA (wOBA-ish): how much each outcome is "worth". Used
// only to rank players for roster construction — not part of the sim.
const W: Record<string, number> = { bb: 0.69, b1: 0.89, b2: 1.27, b3: 1.62, hr: 2.1 };
const hitterValue = (v: OutcomeVector) => W.bb! * v.bb + W.b1! * v.b1 + W.b2! * v.b2 + W.b3! * v.b3 + W.hr! * v.hr;
const pitcherCost = (a: OutcomeVector) => hitterValue(a); // lower allowed value = better pitcher

type LoadedHitter = Hitter & { value: number };
type LoadedPitcher = Pitcher & { cost: number };

type Pool = { hitters: LoadedHitter[]; sp: LoadedPitcher[]; rp: LoadedPitcher[]; cells: string[] };

function load(): Pool {
  const tdDir = join(DATA, "td");
  const files = readdirSync(tdDir).filter((f) => f.endsWith(".json"));
  const hitters: LoadedHitter[] = [];
  const sp: LoadedPitcher[] = [];
  const rp: LoadedPitcher[] = [];
  for (const f of files) {
    const chunk = JSON.parse(readFileSync(join(tdDir, f), "utf-8"));
    for (const h of chunk.hitters) {
      hitters.push({ playerId: h.playerId, name: h.name, pos: h.pos, vector: h.vector, value: hitterValue(h.vector) });
    }
    for (const p of chunk.pitchers) {
      const obj = { playerId: p.playerId, name: p.name, role: p.role, allowed: p.allowed, stamina: p.stamina, cost: pitcherCost(p.allowed) };
      if (p.role === "SP") sp.push(obj);
      else rp.push(obj);
    }
  }
  return { hitters, sp, rp, cells: files };
}

/** Dedupe by playerId keeping the strongest copy, then sort best-first. */
function bestUnique<T extends { playerId: string }>(items: T[], score: (t: T) => number, desc: boolean): T[] {
  const best = new Map<string, T>();
  for (const it of items) {
    const cur = best.get(it.playerId);
    if (!cur || (desc ? score(it) > score(cur) : score(it) < score(cur))) best.set(it.playerId, it);
  }
  return [...best.values()].sort((a, b) => (desc ? score(b) - score(a) : score(a) - score(b)));
}

const strip = (h: LoadedHitter): Hitter => ({ playerId: h.playerId, name: h.name, pos: h.pos, vector: h.vector });
const stripP = (p: LoadedPitcher): Pitcher => ({ playerId: p.playerId, name: p.name, role: p.role, allowed: p.allowed, stamina: p.stamina });

/** The theoretical ceiling: the globally strongest draftable roster. */
function bestPossibleRoster(pool: Pool): Roster {
  return {
    lineup: bestUnique(pool.hitters, (h) => h.value, true).slice(0, 9).map(strip),
    rotation: bestUnique(pool.sp, (p) => p.cost, false).slice(0, 3).map(stripP),
    bullpen: bestUnique(pool.rp, (p) => p.cost, false).slice(0, 1).map(stripP),
  };
}

const AVERAGE_HITTER: Hitter = { playerId: "avg", name: "League Average", pos: ["DH"], vector: NEUTRAL };
const AVERAGE_PITCHER = (role: "SP" | "RP"): Pitcher => ({ playerId: `avg-${role}`, name: "League Average", role, allowed: NEUTRAL, stamina: 0.7 });
const averageRoster = (): Roster => ({
  lineup: Array.from({ length: 9 }, () => AVERAGE_HITTER),
  rotation: [AVERAGE_PITCHER("SP"), AVERAGE_PITCHER("SP"), AVERAGE_PITCHER("SP")],
  bullpen: [AVERAGE_PITCHER("RP")],
});

/**
 * A "great-but-flawed" draft: 13 spins of random team-decades, taking the best
 * un-drafted player of the slot we need each time. Models skilled play across the
 * random spins rather than the global optimum.
 */
function draftRoster(pool: Pool, byCell: Map<string, { hitters: LoadedHitter[]; sp: LoadedPitcher[]; rp: LoadedPitcher[] }>, rng: () => number): Roster {
  const cells = pool.cells;
  const used = new Set<string>();
  const pickFrom = <T extends { playerId: string }>(list: T[]): T | null => {
    for (const it of list) if (!used.has(it.playerId)) return it;
    return null;
  };
  const spin = () => byCell.get(cells[Math.floor(rng() * cells.length)]!)!;

  const lineup: Hitter[] = [];
  while (lineup.length < 9) {
    const pick = pickFrom(spin().hitters);
    if (pick) { used.add(pick.playerId); lineup.push(strip(pick)); }
  }
  const rotation: Pitcher[] = [];
  while (rotation.length < 3) {
    const pick = pickFrom(spin().sp);
    if (pick) { used.add(pick.playerId); rotation.push(stripP(pick)); }
  }
  const bullpen: Pitcher[] = [];
  while (bullpen.length < 1) {
    const pick = pickFrom(spin().rp);
    if (pick) { used.add(pick.playerId); bullpen.push(stripP(pick)); }
  }
  return { lineup, rotation, bullpen };
}

function byCellIndex(): Map<string, { hitters: LoadedHitter[]; sp: LoadedPitcher[]; rp: LoadedPitcher[] }> {
  const tdDir = join(DATA, "td");
  const map = new Map<string, { hitters: LoadedHitter[]; sp: LoadedPitcher[]; rp: LoadedPitcher[] }>();
  for (const f of readdirSync(tdDir).filter((x) => x.endsWith(".json"))) {
    const chunk = JSON.parse(readFileSync(join(tdDir, f), "utf-8"));
    const hitters = (chunk.hitters as any[]).map((h) => ({ playerId: h.playerId, name: h.name, pos: h.pos, vector: h.vector, value: hitterValue(h.vector) })).sort((a, b) => b.value - a.value);
    const sp = (chunk.pitchers as any[]).filter((p) => p.role === "SP").map((p) => ({ playerId: p.playerId, name: p.name, role: "SP" as const, allowed: p.allowed, stamina: p.stamina, cost: pitcherCost(p.allowed) })).sort((a, b) => a.cost - b.cost);
    const rp = (chunk.pitchers as any[]).filter((p) => p.role === "RP").map((p) => ({ playerId: p.playerId, name: p.name, role: "RP" as const, allowed: p.allowed, stamina: p.stamina, cost: pitcherCost(p.allowed) })).sort((a, b) => a.cost - b.cost);
    map.set(f, { hitters, sp, rp });
  }
  return map;
}

function pct(sorted: number[], p: number): number {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[i]!;
}
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

function main(): void {
  const pool = load();
  const byCell = byCellIndex();

  // 1. Run environment — all-average roster.
  const avg = averageRoster();
  let rf = 0;
  let ra = 0;
  const AVG_SEASONS = 200;
  let avgWins = 0;
  for (let s = 0; s < AVG_SEASONS; s++) {
    const r = simulateSeason(avg, LEAGUE_AVERAGE_OPPONENT, s);
    avgWins += r.record.w;
    for (const g of r.gameLogs) { rf += g.home.runs; ra += g.away.runs; }
  }
  const rgFor = rf / AVG_SEASONS / 162;
  const rgAgainst = ra / AVG_SEASONS / 162;

  // 2 + 3. Optimal play = best-pick draft runs (game-design-notes): the strongest
  // roster a player can actually assemble across random spins. One distribution
  // answers both SC-004.2 (its top 1–3% reach 162-0) and SC-004.3 (its bulk lands
  // 145–158).
  const N_DRAFT = 5000;
  const draftWins: number[] = [];
  let perfectDraft = 0;
  let inBand = 0;
  const drng = mulberry32(777);
  for (let s = 0; s < N_DRAFT; s++) {
    const roster = draftRoster(pool, byCell, () => drng());
    const w = simulateSeason(roster, LEAGUE_AVERAGE_OPPONENT, s).record.w;
    draftWins.push(w);
    if (w === 162) perfectDraft++;
    if (w >= 145 && w <= 158) inBand++;
  }
  draftWins.sort((a, b) => a - b);

  // Sanity ceiling: the (in-game-unreachable) globally best roster should be able
  // to reach 162-0 — confirms perfection is achievable, not a metric.
  const best = bestPossibleRoster(pool);
  const N_CEIL = 500;
  let perfectCeil = 0;
  for (let s = 0; s < N_CEIL; s++) if (simulateSeason(best, LEAGUE_AVERAGE_OPPONENT, s).record.w === 162) perfectCeil++;

  const report = {
    edition: JSON.parse(readFileSync(join(DATA, "ATTRIBUTION.json"), "utf-8")).edition,
    pool: { hitters: pool.hitters.length, sp: pool.sp.length, rp: pool.rp.length, cells: pool.cells.length },
    runEnvironment: { seasons: AVG_SEASONS, runsForPerGame: +rgFor.toFixed(3), runsAgainstPerGame: +rgAgainst.toFixed(3), avgWinPct: +(avgWins / AVG_SEASONS / 162).toFixed(3) },
    optimalPlay_bestPickDrafts: {
      drafts: N_DRAFT,
      meanWins: +mean(draftWins).toFixed(1),
      p50: pct(draftWins, 50),
      p90: pct(draftWins, 90),
      p97: pct(draftWins, 97),
      p99: pct(draftWins, 99),
      perfect162_0: perfectDraft,
      perfectPct: +((100 * perfectDraft) / N_DRAFT).toFixed(2),
      inBand145_158Pct: +((100 * inBand) / N_DRAFT).toFixed(1),
    },
    theoreticalCeiling_globalBestRoster: { seasons: N_CEIL, perfectPct: +((100 * perfectCeil) / N_CEIL).toFixed(1) },
    scTargets: { "SC-004.1 runEnv ±10% & ~.500": "see runEnvironment", "SC-004.2 top 1-3% reach 162-0": "see optimalPlay.perfectPct", "SC-004.3 great-but-flawed 145-158": "see optimalPlay.inBand145_158Pct" },
  };

  writeFileSync(join(HERE, "calibration.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}

main();
