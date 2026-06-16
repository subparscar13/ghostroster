/**
 * D-011 calibration readout. Reads the committed public/data (already z-scored) and
 * reports, for the current SCALE:
 *   - CEILING frame: the globally best-possible roster, full 162-0..150-12 distribution.
 *   - REALISTIC frame: best-pick random drafts (summary: 162-0 rate, mean, ≥150 band).
 * No damping here — the data already carries the projection. Run: npx tsx pipeline/tuning/ceiling_dist.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { LEAGUE_AVERAGE_OPPONENT } from "../../src/sim/baseline";
import { mulberry32 } from "../../src/sim/rng";
import { simulateSeason } from "../../src/sim/season";

const HERE = dirname(fileURLToPath(import.meta.url));
const TD = join(HERE, "..", "..", "public", "data", "td");
const W: Record<string, number> = { bb: 0.69, b1: 0.89, b2: 1.27, b3: 1.62, hr: 2.1 };
const hv = (v: any) => W.bb! * v.bb + W.b1! * v.b1 + W.b2! * v.b2 + W.b3! * v.b3 + W.hr! * v.hr;

const cells: any[] = [];
const allH: any[] = [];
const allSP: any[] = [];
const allRP: any[] = [];
for (const f of readdirSync(TD).filter((x) => x.endsWith(".json"))) {
  const d = JSON.parse(readFileSync(join(TD, f), "utf-8"));
  const H = d.hitters.map((h: any) => ({ playerId: h.playerId, name: h.name, pos: h.pos, vector: h.vector, v: hv(h.vector) })).sort((a: any, b: any) => b.v - a.v);
  const S = d.pitchers.filter((p: any) => p.role === "SP").map((p: any) => ({ playerId: p.playerId, name: p.name, role: "SP", allowed: p.allowed, stamina: p.stamina, v: hv(p.allowed) })).sort((a: any, b: any) => a.v - b.v);
  const R = d.pitchers.filter((p: any) => p.role === "RP").map((p: any) => ({ playerId: p.playerId, name: p.name, role: "RP", allowed: p.allowed, stamina: p.stamina, v: hv(p.allowed) })).sort((a: any, b: any) => a.v - b.v);
  cells.push({ H, S, R });
  allH.push(...H); allSP.push(...S); allRP.push(...R);
}

function bestUnique(items: any[], desc: boolean) {
  const best = new Map<string, any>();
  for (const it of items) { const cur = best.get(it.playerId); if (!cur || (desc ? it.v > cur.v : it.v < cur.v)) best.set(it.playerId, it); }
  return [...best.values()].sort((a, b) => (desc ? b.v - a.v : a.v - b.v));
}
const stripH = (h: any) => ({ playerId: h.playerId, name: h.name, pos: h.pos, vector: h.vector });
const stripP = (p: any) => ({ playerId: p.playerId, name: p.name, role: p.role, allowed: p.allowed, stamina: p.stamina });
const best = {
  lineup: bestUnique(allH, true).slice(0, 9).map(stripH),
  rotation: bestUnique(allSP, false).slice(0, 3).map(stripP),
  bullpen: bestUnique(allRP, false).slice(0, 1).map(stripP),
};

// CEILING distribution
const NC = 4000;
const ceil: Record<number, number> = {};
for (let s = 0; s < NC; s++) { const w = simulateSeason(best, LEAGUE_AVERAGE_OPPONENT, s).record.w; ceil[w] = (ceil[w] || 0) + 1; }
console.log(`CEILING (best-possible roster, ${NC} seeds)`);
console.log("  best 9 hitters:", best.lineup.map((h) => h.name).join(", "));
for (let w = 162; w >= 150; w--) { const p = (100 * (ceil[w] || 0)) / NC; if (p >= 0.05) console.log(`  ${w}-${162 - w}  ${p.toFixed(1)}%`); }

// REALISTIC best-pick drafts
function draft(rng: () => number) {
  const used = new Set<string>();
  const pickH = () => { const c = cells[Math.floor(rng() * cells.length)]; for (const h of c.H) if (!used.has(h.playerId)) { used.add(h.playerId); return stripH(h); } return null; };
  const pickP = (k: "S" | "R") => { const c = cells[Math.floor(rng() * cells.length)]; for (const p of c[k]) if (!used.has(p.playerId)) { used.add(p.playerId); return stripP(p); } return null; };
  const lineup: any[] = []; while (lineup.length < 9) { const x = pickH(); if (x) lineup.push(x); }
  const rotation: any[] = []; while (rotation.length < 3) { const x = pickP("S"); if (x) rotation.push(x); }
  const bullpen: any[] = []; while (bullpen.length < 1) { const x = pickP("R"); if (x) bullpen.push(x); }
  return { lineup, rotation, bullpen };
}
const ND = 3000;
const rng = mulberry32(777);
let perfect = 0, ge150 = 0, band = 0, sum = 0;
const dist: Record<number, number> = {};
for (let s = 0; s < ND; s++) { const w = simulateSeason(draft(rng), LEAGUE_AVERAGE_OPPONENT, s).record.w; dist[w] = (dist[w] || 0) + 1; sum += w; if (w === 162) perfect++; if (w >= 150) ge150++; if (w >= 145 && w <= 158) band++; }
console.log(`\nREALISTIC (best-pick draft, ${ND} drafts)`);
console.log(`  162-0=${((100 * perfect) / ND).toFixed(2)}%  >=150W=${((100 * ge150) / ND).toFixed(1)}%  145-158band=${((100 * band) / ND).toFixed(1)}%  meanW=${(sum / ND).toFixed(1)}`);
for (let w = 162; w >= 150; w--) { const p = (100 * (dist[w] || 0)) / ND; if (p >= 0.05) console.log(`  ${w}-${162 - w}  ${p.toFixed(1)}%`); }
