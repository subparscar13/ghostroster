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
**Era adjustment:** league-relative rates (player rate ÷ league average that season, computable from Lahman alone). Z-scores remain a fallback if 1968-style outlier seasons distort results — validate in the tuning notebook. *(Superseded 2026-06-16 by **D-011**: the z-score fallback became the method — the ratio did distort low-offense eras.)*
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

## D-009 — Real-name satirical season quotes (v1.1)
**Status:** ✅ Decided 2026-06-14 — **The result screen shows a fabricated, attributed quote "in the style of" a real iconic baseball figure**, reacting to the player's (obviously fictional) all-eras roster.
**Decision:** Attribute satirical quotes to **real, iconic, long-deceased** legends — writers (Ring Lardner, Grantland Rice), broadcasters (Red Barber, Mel Allen, Harry Caray), players/managers (Babe Ruth, Yogi Berra, Casey Stengel, Dizzy Dean, Satchel Paige). Tone is writerly-dry: praise for great seasons, a sharper but deadpan sting for bad ones — **always aimed at the team/season, never defamatory about the quoted person.** No disclaimer.
**Rationale:** This is parody/satire — the quotes obviously could not be real (the figures are commenting on a roster of players who never shared an era). Scoping to long-deceased figures keeps right-of-publicity exposure low (weak/expired post-mortem rights), and keeping every line non-defamatory and team-directed avoids false-light. This is a **deliberate, bounded departure from the project's otherwise-maximal IP caution** (constitution III stays in force for data/marks/photos); flagged here per governance because it changes the IP posture. Revisit if it ever draws a complaint — the quote set is a single data file, trivially editable or removable.
**Amendment 2026-06-16 (T078):** Added famous broadcaster voices on Justin's request — **Vin Scully, Jack Buck, Harry Caray, Bob Uecker** — and rebalanced the pools so no single author dominates (the old set skewed to Grantland Rice). This (a) widens the register beyond the original "writerly-dry, no catchphrases" rule to let each broadcaster's signature voice show (light allusions to "holy cow" / "go crazy" / "front row," not verbatim copyrighted calls), and (b) extends the figure set to **more recently deceased** names (Scully 2022, Uecker Jan 2025), which carries somewhat higher post-mortem-publicity exposure than the original long-deceased scope. Still parody, team/season-directed, non-defamatory, no disclaimer; same single-file, trivially-removable posture. Accepted by Justin as the owner of this tradeoff.

## D-010 — In-app comment submission (v1.1)
**Status:** ✅ Decided 2026-06-14 — **A "leave a comment" button + modal anyone can use with no login**; submissions go to the maker (private, not shown publicly).
**Decision:** Since v1 ships no backend (constitution IV), the box POSTs to a **free third-party form service** (Formspree-class) — the same posture as the tip-jar link and the env-gated analytics. It is **inert until `NEXT_PUBLIC_COMMENT_ENDPOINT` is set** (mirrors `Analytics.tsx`); no infrastructure we run, no datastore we operate. Spam is handled by a hidden honeypot field + the service's filter. Supersedes the earlier "DMs only, no in-app link" feedback choice.
**Constitution check:** Compatible with IV — third-party SaaS is permitted; only a backend/DB **we operate** is forbidden (Edge KV still reserved for the P1 leaderboard). Compatible with III — text only, no marks/photos.
**Privacy:** Comment text + optional name go to the third-party form provider; the app collects nothing else and stores nothing. A one-line note in the modal says so.

## D-011 — Z-score era normalization (sim tuning, v1.1)
**Status:** ✅ Decided 2026-06-16 — **Replace the league-ratio era projection with a z-score projection** (promotes the D-003 fallback to the method).
**Decision:** A player's era-adjusted per-PA vector is now graded by **how many standard deviations he sits above his own era's eligible-regular distribution**, projected onto the neutral baseline:
`adjusted_o = NEUTRAL_o × (1 + SCALE × z_o)`, where `z_o = (raw_o − mean_o) / std_o` and the mean+std are computed across the same eligibility gate the pool ships (≥ 80 G & 200 PA hitters; ≥ 20 GS / ≥ 30 relief pitchers). **`SCALE = 0.33`**, calibrated (below) so the globally optimal roster reaches 162-0 ~30–45% of the time. The old projection — `NEUTRAL × raw/league` — is gone.
**Why:** Two post-launch problems shared one root cause. (1) **Credibility:** in low-offense eras the league rate is tiny, so an ordinary edge became a huge *ratio*, over-amplifying dead-ball seasons in the rankings (flagged in `docs/how-the-sim-works.md` as "a known rough edge"). (2) **Difficulty:** the optimal-roster ceiling went 162-0 **95.8%** of the time, so the marquee goal felt unearned. Measuring deviation against the era's actual spread of players fixes the rankings *and* gives one principled difficulty knob. (Plain damping of the ratio was rejected — it compresses magnitudes but preserves rank order, so it cannot fix the rankings.) D-003 already named z-scores as the documented fallback for exactly this distortion.
**Calibration (4,000-seed ceiling + 3,000 best-pick drafts, lahman-2025):**

| 162-0 | baseline (ratio) | z-score SCALE=0.33 |
|---|---|---|
| **Ceiling** (best-possible roster) | 95.8% | **41.1%** (161-1 37%, 160-2 16%, 159-3 5%) |
| **Realistic** (best-pick draft) | 0.13%, mean 150.1 W | **0.07%, mean 148.9 W**, 145–158 band 82% |

The realistic frame players actually experience is essentially unchanged (still ~0.1% perfect, mean ~149); the ceiling is now a genuine accomplishment. Picking which 162-0 ceiling to target (moderate, ~30–45%) was Justin's call.
**Determinism/governance:** `SCALE` is a pinned module constant in `vectors.py`; same edition + default → byte-identical output (constitution V, verified). A `GR_ZSCALE` env var overrides it for offline calibration sweeps only — production builds leave it unset. Re-pinned the known-vector, real-spotcheck, and golden checks. No change to the pure sim (the projection is upstream, pipeline-side), so PvP insurance (D-001) is unaffected.

## D-012 — Arcade leaderboard (daily/weekly/all-time)
**Status:** ✅ Decided/built 2026-06-18 (revisited from the 2026-06-16 deferral). This is the P1 feature that D-005 / Constitution IV reserved Edge storage for — landing it introduces the first backend we operate.
**Decision:** Daily / weekly / all-time leaderboard built on the **daily challenge** (the only cross-player-comparable mode). **Arcade 3-initials + anonymous per-device id, no logins** (FR-014 preserved — submission is explicit/opt-in; the game is fully playable without it). Backend is a **Cloudflare Worker + D1** (SQL for ranking) deployed **separately** from the static GitHub-Pages app. **Ranking:** daily = most wins (run-diff tiebreak), shown with the day's division (D-015); weekly/all-time = each device's **best single daily result** (all-time also shows a 162-0 count). One submission feeds all three.
**Integrity — verify board-topping claims (2026-06-18):** the submission now carries the roster as `(playerId, slot, chunk)` — **no vectors**. Any claim with `wins >= VERIFY_MIN_WINS` (default 150) is **re-simulated server-side**: the Worker fetches the *authoritative* data chunks (`DATA_BASE_URL`), rebuilds the exact roster (`buildSimRoster` logic — OPS-sorted lineup, SP1–3, RP), replays `dailySeed(dateKey)` through the **app's real sim** (imported from `src/sim`, so it can't drift), and rejects (422) on a wins mismatch. Lower scores — which can't top the board — are trusted, to bound Worker CPU (the knob raises the threshold if needed). Other guards unchanged: field validation, max body, one best row per `(device, day)`, locked CORS. *(Supersedes the 2026-06-16 "trust the score" choice; a tampered roster can't pass because vectors come from authoritative data, not the client.)*
**Constitution check (IV):** the reserved edge backend now lands as Worker+D1. The static app, sim, pipeline, and data are unchanged; the feature is **env-gated** (`NEXT_PUBLIC_LEADERBOARD_ENDPOINT`) and ships **inert** until the operator deploys the Worker and sets the repo variable — so merging it doesn't alter the live site. Worker code + deploy steps live in `worker/`.
**Superseded:** the 2026-06-16 "store-and-spot-check" integrity choice → "trust the score."

## D-013 — Starter usage rule: 1–8 + complete-game no-hitters
**Status:** ✅ Decided 2026-06-16 — **the starter pitches innings 1–8; from the 9th on he stays in only while he's still no-hitting, otherwise the reliever closes.** (Was: starter 1–6, reliever 7+.)
**Rationale:** More authentic and rewarding — deep starts and the occasional complete-game no-hitter. Resolves part of the long-flagged "RP usage rule" tuning item.
**Odds impact (measured, 4,000-seed ceiling + 2,000 drafts):** optimal-roster 162-0 **41% → 34%** (still inside the D-011 30–45% target, so no `SCALE` re-tune); realistic best-pick play **essentially unchanged** (mean 148.9 → 148.4 W). **No-hitters DROP** (ceiling ~45 → ~32/season; realistic 4.4 → 3.8) — the elite reliever used to protect the late innings, so making the slightly-more-hittable starter get the last outs breaks more no-nos. Accepted as a deliberate trade: rarer but more dramatic complete-game no-hitters.
**Tradeoffs:** the reliever now pitches ~1 inning in most games (leans harder on the no-fatigue simplification — still a flagged lever). 
**Determinism/governance:** changes the pure sim → golden master re-pinned (digest + highlights; record held at 127-35); the sim now records a per-game starter/reliever innings+runs split (`GameLog.pitching`) so the box-score Season-stats lines (FR-020) stay exact instead of re-deriving the rule. Still pure/seeded; PvP seam (D-001) intact.

## D-014 — Recalibrate the ceiling to ~50% — PROPOSED, NOT ADOPTED
**Status:** ⏸️ Parked 2026-06-16 — Justin requested it, then tabled before implementation. Number reserved.
**Sketch:** raise the z-score `SCALE` (~0.33 → ~0.35) so the *optimal* roster hits 162-0 ~50% (vs ~34% after D-013). Analysis confirmed realistic play barely moves and the *optimal roster is unreachable in normal play* (13 random per-pick spins; 2+2 re-rolls), so a real perfect season stays well under ~1% regardless. Full plan in the session plan file; pick up by re-approving it.

## D-015 — Daily "division of the day"
**Status:** ✅ Decided 2026-06-16 — **the daily challenge is themed by weekday: you may only spin one MLB division's franchises that day** (e.g. Wednesday = NL Central → Cubs/Cards/Reds/Pirates/Brewers across any decade). **Classic mode is unchanged.**
**Decisions:** **current-day divisions** (a franchise's present division applies to all its eras — the data stores everything under current franchise ids, so it's a clean 30 → 6 map); **re-rolls constrained to the day's division** (team re-roll → another franchise in the division, decade re-roll → another decade of the same franchise); **Sunday = All-Star pool** — each franchise's single strongest decade (the pipeline marks one `allStar` cell per franchise in `teams.json` by best-roster value; "strongest" is by sim value, not fan reputation, so the picks are the teams that actually play best). Weekday map (adjustable): Mon AL East · Tue AL Central · Wed NL Central · Thu AL West · Fri NL East · Sat NL West · Sun All-Stars.
**Accepted tradeoff:** divisions aren't balanced for historical strength, so 162-0 difficulty swings by weekday (AL East / NL Central stacked; expansion-heavy AL West / NL West thinner) — intended variety.
**Implementation/governance:** a frontend `divisionOf` map + `dailyTheme(dateKey)` (deterministic from the UTC weekday) + a pool filter on the daily's spinnable cells (`src/lib/divisions.ts`); `spin.ts` re-rolls operate over the passed pool (classic passes the full index → unchanged). The only data change is the additive `allStar` flag on `teams.json` cells (determinism re-verified byte-identical). Pure sim untouched; daily seed/number unchanged. Known minor edge (pre-existing): a daily run persisted across midnight resumes with the prior day's picks under the new day's division — out of scope here.
