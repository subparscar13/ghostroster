# CLAUDE.md — Ghost Roster

Browser game: spin for a random MLB franchise + decade, draft 13 players
(9 hitters, 3 SP, 1 RP), and a Markov-chain plate-appearance-level simulation
plays your roster through a 162-game season against era-average opposition.
Goal: 162-0. Built solo with Claude Code as a documented spec→ship portfolio piece.

**`docs/kickoff-brief.md` is the implementation contract. `docs/decision-log.md`
is the source of truth for decisions (D-001–D-008).** Treat decided items as
fixed constraints, not open questions — do not propose alternatives. If scope or
model must change, it goes back through the decision log first.

## Non-negotiable constraints

These are settled. Honor them in every change; do not re-litigate.

- **Budget: 12–15 build-days total.** Anything threatening that number gets
  **cut from v1, not added to it.** Cut order, in sequence:
  `season ticker animation → generated quips → box-score depth (keep line scores) → grade system (record only)`.
  Never cut a P0 (sim, draft, daily challenge, attribution).
- **No Baseball-Reference scraping anywhere — including dev scripts.** BRef's
  terms prohibit it and Sports Reference has issued takedowns. Use the Lahman
  CSV/SQLite distribution (or pybaseball's *Lahman* loader, pipeline-side only).
  Never ship anything BRef-scraped. Also avoid the MLB Stats API (commercial ToS).
- **The sim is a pure, seeded, side-effect-free function:**
  `simulateSeason(roster, opponent, seed) → SeasonResult`. No I/O, no globals, no
  wall-clock, no `Math.random`. This is P2 PvP insurance (a second roster slots
  into `opponent` later — composition, not rewrite). RNG = mulberry32 (or
  xoshiro128**), seeded; must reproduce identical results across browsers.
- **Licensing & attribution.** Data is the Lahman Database (current edition),
  **CC BY-SA**. Every screen shows a footer: Lahman/SABR attribution +
  "not affiliated with MLB or MLBPA" disclaimer + tip-jar link. **Text only** for
  franchises (no logos/marks, no player photos). Negro Leagues excluded from v1
  (D-007) though present in Lahman.
- **Static-first, no backend (D-005).** Next.js static export (`output: 'export'`),
  client-side sim, static JSON, free-tier host (planned: Cloudflare Pages). Edge KV
  is deferred until the P1 leaderboard lands.
- **Deterministic pipeline.** Same Lahman edition in → byte-identical JSON out
  (sorted keys, stable ordering, pinned edition, fixed rounding).

## Performance budgets (hard targets)

- Full 162-game season simulates **< 2s on a mid-range phone**.
- Each `public/data/td/*.json` chunk **< 100 KB**; total `public/data/` payload **< 20 MB**.
- Total page weight **< 5 MB** excluding lazy data chunks. Mobile-first.

## Repo layout

- `docs/` — the contract + decision log + design/PRD/data-source notes.
- `.specify/` — GitHub Spec Kit (constitution, specs, plan, tasks).
- `pipeline/` — Python (uv + pandas) offline pipeline. Lahman → `public/data/`.
- `public/data/` — committed generated JSON (`teams.json` + `td/{franchiseId}-{decade}.json`).
- `app/` or `src/` — Next.js frontend + the pure sim module (added in M2/M3).

## Milestones (≈13.5 days incl. bootstrap)

M0 bootstrap/Spec Kit (0.5) → M1 pipeline (2) → M2 sim + tuning (4) →
M3 UI spin/draft/result (3) → M4 box scores/share/daily (2.5) → M5 polish/deploy (1.5).

## Tooling

- Python pipeline: `uv` (required by D-005). Tests: `pytest`.
- Frontend (M2+): Node LTS, Next.js. Not installed until M2.
- `gh` repo creation is deferred (local-only bootstrap for now).

## Open tuning items — flag, don't silently resolve

Pitcher eligibility thresholds + RP usage rule (ship §3 defaults); 2B/3B-allowed
estimation from league splits; z-score fallback for outlier seasons (1968);
base-out advancement table + no-RP-fatigue lever; grade-scale design;
"best possible team today" solver (P1); run-environment / 162-0 / near-miss
calibration targets (M2). `ghostroster.app` + social handles: Justin's action,
time-sensitive (D-006).

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
