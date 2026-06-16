# Claude Code Kickoff Brief — Ghost Roster

**Date:** 2026-06-12 · **Source of truth for decisions:** `02_product/decision-log.md` · **Budget:** ~12–15 build-days
**This document is the implementation contract.** The Claude Code repo builds against this spec; changes to scope or model go back through the decision log first.

## 1. Product summary

Ghost Roster (D-006; target domain ghostroster.app — registration pending) is a browser game: spin for a random MLB franchise + decade, draft 13 players (9 hitters, 3 SP, 1 RP) one per spin, then watch a real Markov-chain simulation play your roster through a 162-game season against era-average opposition. Chase 162-0. **Differentiation thesis (D-001):** every existing clone uses an opaque rating threshold; we simulate actual baseball — plate appearance by plate appearance — producing box scores, streaks, and season stories, not just a W-L number. Built solo with Claude Code as a documented spec→ship portfolio piece.

## 2. Locked decisions

| # | Decision |
|---|---|
| D-001 | Markov PA-level sim + portfolio piece (A+D) |
| D-002 | 13 picks: 9 hitters (one per fielding slot, DH-loose), 3 SP, 1 RP |
| D-003 | Markov sim; league-relative era adjustment; box scores in v1 |
| D-004 | v1 = Classic + daily challenge + box scores; no accounts; ~12–15 build-days |
| D-005 | Static-first: Next.js static export, client-side sim, Python offline pipeline, Vercel/CF Pages, no backend |
| D-006 | "Ghost Roster" — ghostroster.app (Justin registering); daily share prefix "Ghost Roster #N" |
| D-007 | Negro Leagues excluded from v1 (data ready in Lahman if reopened) |
| D-008 | Tip jar only |

Non-goals (PRD): accounts, mobile app, multi-sport, live MLB data, monetization beyond tip jar, NeL content.

## 3. Data schema & pipeline contract

**Source:** Lahman Database, current edition (verify edition year + license text at download). CC BY-SA attribution + "not affiliated with MLB/MLBPA" footer required. No Baseball-Reference scraping anywhere, including dev scripts.

**Pipeline:** `/pipeline` directory in the same repo. Python (uv + pandas). Runs offline; commits generated JSON to `/public/data/`. Deterministic: same Lahman edition in → byte-identical JSON out.

**Outputs:**

- `teams.json` — spin index: every (franchise, decade) cell with ≥ minimum eligible players. Franchise names as text only (no logos/marks).
- `td/{franchiseId}-{decade}.json` — one chunk per team-decade, lazy-loaded on spin, **< 100 KB each**. Contains eligible players with display stats + sim vectors.

**Eligibility (defaults; tune in M1):** hitters ≥ 20 G with that team in that decade (genre convention); SP ≥ 10 starts; RP ≥ 20 relief appearances. Player stats = **best single season** with that team in that decade (peaks are more fun — game-design-notes).

**Per-player sim vector (era-adjusted, league-relative):**

- Hitter: per-PA outcome probabilities `{BB, 1B, 2B, 3B, HR, OUT}` (HBP folded into BB; SO/BIP split optional cosmetic). Era adjustment: player rate ÷ league rate that season, applied to a neutral baseline environment. *(Shipped method updated by D-011: a z-score against the era's eligible-regular distribution, not a raw ratio — same neutral-baseline projection.)*
- Pitcher: allowed-outcome vector in the same shape, from opponents' results (derivable from Lahman pitching lines: BB, H, HR, IP; 2B/3B allowed estimated from league splits). Plus `stamina` display stat.
- Display block: raw season line (year, team, traditional stats) for the draft UI.

**Pipeline acceptance checks (M1 exit):** total payload < 20 MB; every chunk < 100 KB; every team-decade has ≥ 9 eligible hitters, ≥ 3 SP, ≥ 1 RP (cells that fail are excluded from `teams.json`); spot-check 5 known players' vectors against hand-computed values.

## 4. Sim spec

**Signature (pure, seeded, side-effect-free — PvP insurance per PRD P2):**

```
simulateSeason(roster: Roster, opponent: OpponentModel, seed: uint32) → SeasonResult
```

- `OpponentModel` v1 = era-average league team (league-baseline outcome vectors). The optional second roster slots in here later for PvP — composition, not rewrite.
- `SeasonResult` = { record, gameLogs[162] (line score + batting lines), seasonHighlights (longest streak, no-hitters, best/worst game, top performer), grade }.

**Game model:**

- Each PA: batter outcome vector blended vs. pitcher via log5/odds-ratio against the league baseline; sample with seeded RNG.
- Base-out state machine: 24 base-out states; simple advancement table (single: runners +1 base, +2 from 2nd 50%; double: +2; etc. — keep the table dumb and documented, tune only if run environment validation fails).
- Innings/extra innings standard; 162 games; rotation cycles SP1→SP2→SP3; RP pitches innings 7–9 every game (no fatigue model in v1 — flag as tuning lever). *(Updated by D-013: starter goes 1–8 and completes the game on a live no-hitter; reliever otherwise. No fatigue still.)*
- **RNG:** mulberry32 (or xoshiro128**), seeded; must reproduce identical results across browsers. Daily seed = hash(salt + YYYY-MM-DD).
- **Performance:** full 162-game season < 2s on a mid-range phone (~38 PA/game × 162 × 2 sides ≈ 12K samples — trivial; budget covers box-score bookkeeping too).

**Tuning targets (M2 exit, via tuning notebook in `/pipeline/tuning`):**

1. Simmed run environment for an all-era-average roster lands within ±10% of the neutral baseline runs/game.
2. 10K simulated optimal-play runs: top ~1–3% reach 162-0 (perfection achievable, rare).
3. Great-but-flawed rosters land 145–158 — the near-miss band is the product.

**Testing:** golden-master tests (fixed seed + fixed roster → exact record and box-score hash); distribution tests from the tuning notebook; cross-browser RNG reproduction test.

## 5. UI spec (screen by screen)

Mobile-first, responsive, no signup, total page weight target < 5 MB excluding lazy data chunks.

1. **Home/Spin** — one tap to start. Slot-machine spin → franchise + decade revealed. Skips: 1 team re-roll + 1 era re-roll per run (scarcity is the agony).
2. **Draft** — 13 rounds. Each spin shows the team-decade's eligible players with best-season stats; **pick + slot assignment in one action**. Filled-roster sidebar persistent. Classic mode shows stats (blind mode is P1 — don't build, don't block).
3. **Simulate** — brief animated season ticker (skippable) → lands on result.
4. **Result** — record headline + letter grade + 13-man roster card with team-decade tags + one season highlight + one generated quip. Native share + canvas-rendered downloadable image (no server). Tap into **box scores**: season game log, any game's line score + batting lines.
5. **Daily** — same seed for everyone (hash of date), one attempt, result in localStorage, spoiler-safe share format (record + grade + emoji squares, no roster reveal). Streaks are P1.

Attribution footer on every screen: Lahman/SABR + MLB/MLBPA disclaimer + tip jar link.

## 6. Milestones (≈13 days, fits 12–15 budget)

| M | Deliverable | Days |
|---|---|---|
| M1 | Pipeline: Lahman → JSON, eligibility, era adjustment, acceptance checks | 2 |
| M2 | Sim engine + golden-master tests + tuning notebook hitting targets | 4 |
| M3 | UI: spin → draft → result (Classic mode) | 3 |
| M4 | Box scores, share cards, daily mode | 2.5 |
| M5 | Polish, analytics (Plausible-class), deploy, launch posts | 1.5 |

**Overrun rule (D-004):** anything threatening the budget gets cut from v1, not added to it. Cut order: season ticker animation → generated quips → box-score depth (keep line scores) → grade system (record only).

## Open items for the build (non-blocking)

- Pitcher eligibility thresholds + RP usage rule: ship the defaults above, revisit only if tuning shows problems.
- Grade scale design (A+ vs. record-only).
- "Best possible team today" post-daily reveal — requires a solver; P1 at most.
- Justin registers ghostroster.app + social handles (time-sensitive; D-006).
