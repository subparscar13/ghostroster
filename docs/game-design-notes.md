# Game design notes

Working notes feeding D-002/D-003. Pseudomath only — implementation goes to the Claude Code repo.

## The three sim models, compared

| | Threshold rating (82-0 style) | Pythagorean | Markov PA-level sim |
|---|---|---|---|
| Build effort | ~1–2 days | ~3–5 days | ~2–4 weeks |
| Explainability | Opaque (until solved) | High ("your roster scores X runs/gm, allows Y") | High + narratable |
| Solvability | Days (proven by 82-0) | Weeks (continuous, harder to game) | Practically unsolvable (stochastic) |
| Output | W-L record | W-L record + run differential | Box scores, streaks, season stories |
| Pitching needed? | No | Yes (or assume league-avg) | Yes |
| Differentiation | None | Mild | The whole thesis (D-001 option A) |

### Pythagorean sketch
1. Era-adjust each hitter's season line (league-relative rates per data-sources.md).
2. Roster runs/game via a linear-weights estimate (wOBA-style) over a 162-game PA budget allocated by lineup slot.
3. Runs allowed from pitcher era-adjusted RA (or league average if hitters-only roster).
4. Expected W% = RS² / (RS² + RA²) (exponent ~1.83 fits better; tune for fun, not accuracy — a perfect season must be *achievable*).
5. Simulate 162 Bernoulli draws so identical rosters can finish 159-3 or 162-0 — near-misses drive replay.

### Markov sketch
- Each PA: outcome sampled from player's era-adjusted probability vector (BB, 1B, 2B, 3B, HR, out; SO/groundout split optional), optionally blended vs. pitcher via log5/odds-ratio.
- Base-out state machine advances runners; 9 innings; 162 games seeded deterministically for the daily.
- Validation: simmed league run environment should land near the real era's runs/game.
- **Performance note:** must run client-side in < ~2s for a 162-game season — almost certainly fine in JS/WASM (a PA resolve is trivial; ~38 PA/game × 162 ≈ 6K samples per side).

## Tuning the "perfect season" target

Real baseball's best is 116 wins; 162-0 is absurd — that absurdity is the brand. Whatever the model, calibrate so that a god-tier draw (think: prime Ruth, Bonds, Mays + Pedro) *can* clear 162-0, and a great-but-flawed roster lands 145–158. The near-miss band is where the fun lives. Plan a tuning notebook: sample 10K random "best-pick" runs, plot the record distribution, adjust until ~top 1–3% of optimal play hits perfection.

## Draft mechanics decisions (sub-D-002)

- Player eligibility per team-decade: ≥20 games convention; consider position eligibility (did he actually play SS that decade?) vs. 162-0.net's "DH takes anyone" looseness.
- Best-season vs. decade-average stats: best-single-season (162-0.net) is more fun (peaks!) and simpler to display.
- Skips: one team re-roll + one era re-roll is genre standard; the scarcity creates the agony.
- Pick+slot in one action (diamond-draft) vs. pick-then-slot: one action is better mobile UX.

## Shareability spec (don't skimp — this IS the growth model)

- Result card: record headline, letter grade, 13-man roster (9H+3SP+1RP per D-002) with team-decade tags, one generated quip ("Your bullpen was held together by tape").
- One-tap native share + downloadable image (canvas-render, no server).
- Daily mode result must be spoiler-safe (record + grade, no roster reveal) like Wordle squares.
