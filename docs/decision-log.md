# Decision log

Statuses: **Open** → **Decided** (with date + rationale). Decided items are settled unless explicitly reopened. Work top-down; D-001 gates most of the rest.

---

## D-001 — Differentiation thesis ⛔ blocking
**Status:** ✅ Decided 2026-06-12 — **A+D: Real simulation, built as a portfolio piece.**
**Decision:** Markov PA-level sim is the differentiator (the only open position no clone occupies — all five use rating thresholds), built and documented as an Agentic-PM showcase (spec→ship solo with Claude Code). Distribution success is upside, not the success criterion; the portfolio framing de-risks the decaying-virality problem.
**Rationale:** Sim authenticity produces shareable *content* (box scores, season stories), is hardest to fast-follow, and baseball is uniquely suited to it (discrete PAs). B (PvP) stays P2, layered on the pure-function sim. C rejected — smaller ceiling, data gaps.
<details><summary>Original options considered</summary>
A real sim · B head-to-head · C niche player pool · D portfolio piece. A and D combined as predicted.
</details>

## D-002 — Roster shape ⛔ blocking
**Status:** ✅ Decided 2026-06-12 — **9 hitters + 3 SP + 1 RP (13 picks).**
**Rationale:** A real rotation is what makes the Markov sim feel like baseball (justifies D-001); 3 SP cycle across the 162-game schedule, 1 RP with a simple usage rule. More authentic than the 11-pick genre convention without going full-roster (162baseball's 17 picks). Cost acknowledged: rotation/bullpen logic adds ~1–2 build-days vs. 9H+1SP; included in the revised 12–15 day estimate (see D-004).

## D-003 — Simulation/rating model ⛔ blocking
**Status:** ✅ Decided 2026-06-12 — **Markov-chain PA-level sim**, with **box scores / season output in v1** (not deferred to P1).
**Era adjustment:** league-relative rates (player rate ÷ league average that season, computable from Lahman alone). Z-scores remain a fallback if 1968-style outlier seasons distort results — validate in the tuning notebook.
**Rationale:** Follows directly from D-001; threshold and Pythagorean models rejected as non-differentiating. Each PA samples from era-adjusted outcome vectors (BB/1B/2B/3B/HR/out), pitcher blend via log5/odds-ratio, base-out state machine, deterministic seed. Must run a 162-game season client-side in <2s (per game-design-notes.md). Practically unsolvable = durable fun.

## D-004 — Scope of v1
**Status:** ✅ Decided 2026-06-12 — **Classic mode + daily challenge + box-score/season output, no accounts, share-image result screen, static frontend.** Blind mode, leaderboards, streaks = P1. PvP = P2 (sim stays a pure seeded function as insurance).
**Budget:** Justin explicitly chose to expand beyond the initial 5–10 build-day budget to keep full Markov + box scores in v1. **Working estimate: ~12–15 build-days.** Anything threatening that number gets cut from v1, not added to it.

## D-005 — Stack
**Status:** ✅ Decided 2026-06-12 — **Static-first (architecture-options.md Option 1).** Next.js static export + static JSON, sim runs client-side, Vercel/Cloudflare Pages free tier, no backend in v1. Python (uv + pandas) offline pipeline: Lahman → per-team-decade JSON (hitters *and* pitchers now, per D-002), lazy-loaded chunks <100 KB. Daily challenge = hash(date) seed, no server. Edge KV backend deferred until leaderboard (P1) lands.

## D-006 — Name & domain
**Status:** ✅ Decided 2026-06-12 (revised same day) — **"Ghost Roster"**, target domain **ghostroster.app**.
**Rationale:** Says the era-collision hook (drafting players across time), no product collisions in a 2026-06-12 search, and works as a daily share prefix ("Ghost Roster #14: 158-4 🟩🟩🟥"). The deciding factor: RDAP checks (Verisign/Google Registry, 2026-06-12) showed perfectseason.com/.app and ghostroster.com all registered, while **ghostroster.app is likely available** — "Perfect Season" had no clean domain. "27 Up" rejected (OOTP Baseball 27 confusion).
**Action (Justin, time-sensitive):** confirm + register ghostroster.app at a registrar. Also check X/social handle availability before launch.
**History:** earlier same-day decision was "Perfect Season" provisional; flipped to Ghost Roster on domain evidence. Folder/workspace name stays `05_perfect-season`.

## D-007 — Negro Leagues inclusion
**Status:** ✅ Decided 2026-06-12 — **Not in v1.**
**Context:** The licensing question resolved itself — Lahman's Oct 2025 edition now includes Seamheads-licensed Negro Leagues data (through 1948) for free, so inclusion would cost only the short-season era-adjustment and display work (~0.5–1 day). Justin decided against v1 inclusion anyway.
**Rationale:** Scope discipline on an already-expanded 12–15 day budget. Moved to parking lot as a post-launch candidate — the data path (same Lahman tables) is now trivial, so this is reopenable cheaply. Noted honestly: 162-0.net includes NeL and v1 will compare unfavorably on this axis if reviewers look.

## D-008 — Monetization
**Status:** ✅ Decided 2026-06-12 — **None beyond an optional tip jar** (Ko-fi-style).
**Rationale:** Genre convention, zero build cost, and keeps right-of-publicity exposure low (player names in a free game = weak claims; ads/paid would raise the risk per 04_launch/distribution-notes.md). Revisit only with real traction.
