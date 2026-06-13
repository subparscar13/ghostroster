# Ghost Roster Constitution

Principles that gate every specification, plan, and task. Derived from the
non-negotiables in `docs/kickoff-brief.md` and the decisions in
`docs/decision-log.md` (D-001–D-008). A spec, plan, or task that violates a
principle below is rejected, not negotiated. Decided items (D-001–D-008) are
fixed inputs, not open questions.

## Core Principles

### I. Decisions Are Fixed (NON-NEGOTIABLE)
D-001 through D-008 are settled. The Markov PA-level sim (D-001/D-003), the
13-pick roster shape of 9 hitters + 3 SP + 1 RP (D-002), the v1 scope (D-004),
the static-first stack (D-005), the name/domain (D-006), Negro-Leagues exclusion
(D-007), and tip-jar-only monetization (D-008) are not to be re-proposed. Any
change to a decided item goes back through `docs/decision-log.md` first, then
forward into specs — never the reverse.

### II. The Sim Is a Pure, Seeded Function (NON-NEGOTIABLE)
`simulateSeason(roster, opponent, seed) → SeasonResult` is pure, deterministic,
and side-effect-free: no I/O, no globals, no wall-clock, no ambient
`Math.random`. RNG is mulberry32 (or xoshiro128**), explicitly seeded, and must
reproduce identical results across browsers. `opponent` is a model parameter so a
second roster can slot in for P2 PvP by composition, not rewrite. The daily seed
is `hash(salt + YYYY-MM-DD)`. Any feature that would make the sim observe or
mutate external state is rejected.

### III. Licensing & Attribution Are Load-Bearing (NON-NEGOTIABLE)
Data is the Lahman Database (current edition), Creative Commons
Attribution-ShareAlike. Edition year and license text are verified at build time;
the pipeline fails if the license is absent or not the expected one. Every screen
carries the attribution footer: Lahman/SABR credit + "not affiliated with MLB or
MLBPA" + tip-jar link. **No Baseball-Reference scraping anywhere, including dev
scripts**; no MLB Stats API; no team logos, marks, or player photos (franchises
are text only). Negro Leagues data is excluded from v1 (D-007).

### IV. Static-First, No Backend (NON-NEGOTIABLE)
v1 is a Next.js static export with a client-side sim and committed static JSON,
served from a free-tier host. No server, database, or runtime backend ships in
v1. Edge KV is introduced only when the P1 leaderboard lands. The offline data
pipeline is Python (uv + pandas) and is the only build-time data dependency.

### V. Determinism End to End (NON-NEGOTIABLE)
The pipeline is reproducible: the same Lahman edition in produces byte-identical
JSON out (sorted keys, stable ordering, pinned edition, fixed rounding). The sim
is reproducible from `(roster, opponent, seed)`. Golden-master tests pin exact
records and box-score hashes; a cross-browser test confirms RNG reproduction.

### VI. Budget Discipline With a Fixed Cut Order (NON-NEGOTIABLE)
Total build budget is 12–15 days. Anything threatening that number is **cut from
v1, not added to it**, in this exact order:
`season ticker animation → generated quips → box-score depth (keep line scores) → grade system (record only)`.
P0 capabilities — the sim, the draft flow, the daily challenge, and attribution —
are never cut. Scope is removed before the budget is extended.

## Performance Standards (hard gates)

- A full 162-game season simulates in **< 2 seconds on a mid-range phone**.
- Each `public/data/td/{franchiseId}-{decade}.json` chunk is **< 100 KB**; the
  total `public/data/` payload is **< 20 MB**.
- Total page weight is **< 5 MB** excluding lazy-loaded data chunks; mobile-first
  and playable over cellular.

These are acceptance gates, not aspirations. A change that breaches one is not
shippable until it is back under budget.

## Data & Eligibility Contract

- Spin index `teams.json` lists every (franchise, decade) cell meeting the
  eligibility floor; cells failing it are excluded.
- Eligibility defaults (tunable in M1, flagged not silently changed): hitters
  ≥ 80 G and ≥ 200 PA, SP ≥ 20 starts, RP ≥ 30 relief appearances; a cell needs ≥ 9 hitters,
  ≥ 3 SP, ≥ 1 RP.
- Player line = **best single season** with that team in that decade.
- Sim vectors are era-adjusted, league-relative (player rate ÷ league rate that
  season, applied to a neutral baseline); HBP folds into BB; pitcher 2B/3B-allowed
  estimated from league splits (flagged tuning item).

## Governance

This constitution supersedes ad hoc preferences. Specs (`/speckit-specify`),
plans (`/speckit-plan`), and tasks (`/speckit-tasks`) are checked against it; a
conflict is resolved by changing the artifact, not the principle. Amendments
require a corresponding entry or change in `docs/decision-log.md` and a version
bump here. Open *tuning* items (pitcher thresholds, RP usage, advancement table,
grade scale, run-environment calibration) are flagged and may be set during
implementation; open *decided* items may not be reopened without the decision log.

**Version:** 1.0.0 | **Ratified:** 2026-06-12 | **Last amended:** 2026-06-12
