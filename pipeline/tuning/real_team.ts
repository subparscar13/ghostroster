/**
 * Simulate the real-team rosters built by real_team.py and print a comparison
 * readout (mean record, range, percentiles, how often the sim beats the team's real
 * win total). Reads the JSON that real_team.py emits. Run (from repo root):
 *   uv run python pipeline/tuning/real_team.py /tmp/rt.json SEA:2001:"2001 Mariners" ...
 *   npx tsx pipeline/tuning/real_team.ts /tmp/rt.json
 */
import { readFileSync } from "node:fs";

import { LEAGUE_AVERAGE_OPPONENT } from "../../src/sim/baseline";
import { simulateSeason } from "../../src/sim/season";

const path = process.argv[2] ?? "/tmp/rt.json";
const teams = JSON.parse(readFileSync(path, "utf-8")) as Array<{
  label: string; realRecord: string; roster: any; lineupNames: string[]; rotationNames: string[]; closer: string;
}>;

const N = 5000;
const pctOf = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

for (const t of teams) {
  const wins: number[] = [];
  for (let s = 0; s < N; s++) wins.push(simulateSeason(t.roster, LEAGUE_AVERAGE_OPPONENT, s).record.w);
  wins.sort((a, b) => a - b);
  const mean = wins.reduce((a, b) => a + b, 0) / N;
  const realW = Number(t.realRecord.split("-")[0]);
  const beatReal = (100 * wins.filter((w) => w >= realW).length) / N;
  const perfect = (100 * wins.filter((w) => w === 162).length) / N;
  console.log(`\n=== ${t.label}  (real ${t.realRecord}) ===`);
  console.log(`  sim mean ${mean.toFixed(1)}-${(162 - mean).toFixed(1)}   median ${pctOf(wins, 50)}W   range ${wins[0]}-${wins[wins.length - 1]}W`);
  console.log(`  p10 ${pctOf(wins, 10)} · p25 ${pctOf(wins, 25)} · p50 ${pctOf(wins, 50)} · p75 ${pctOf(wins, 75)} · p90 ${pctOf(wins, 90)}`);
  console.log(`  beats real ${realW}W: ${beatReal.toFixed(1)}%   ·   162-0: ${perfect.toFixed(2)}%`);
}
