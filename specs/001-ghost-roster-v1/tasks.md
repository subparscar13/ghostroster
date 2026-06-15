# Tasks: Ghost Roster v1

**Input**: `spec.md`, `plan.md`, `data-model.md` in `specs/001-ghost-roster-v1/`.

**Organization**: By **milestone (M1–M5)** per the kickoff brief §6, not by user
story (the brief mandates milestone structure). Each milestone notes which spec
user stories it advances. Tests are included — the spec explicitly requires them
(pipeline acceptance checks, sim golden masters, RNG reproduction).

**Legend**: `[P]` = parallelizable (different files, no dependency). `[USn]` =
advances spec User Story n.

**Budget**: 13.5 build-days incl. M0. Cut order if exceeded:
season ticker → quips → box-score depth (keep line scores) → grade system.

---

## M0 — Bootstrap + Spec Kit ✅ DONE (~0.5 day)

- [x] T001 `git init` (local), `.gitignore` (public/data/ tracked), `CLAUDE.md`
- [x] T002 Spec Kit init; constitution v1.0.0 from non-negotiables
- [x] T003 spec.md + plan.md + data-model.md + requirements checklist; first commit (docs+constitution, no code)
- [ ] T004 (deferred) `gh repo create ghostroster --private` + push — pending local gh install/auth

---

## M1 — Pipeline: Lahman → JSON ✅ DONE (2 days) 🎯 foundation for all stories

**Goal**: An offline Python pipeline that downloads the current Lahman edition,
verifies its CC BY-SA license, and emits `public/data/teams.json` + per-team-decade
chunks per `data-model.md`, with the four acceptance checks + determinism + license
gate as automated tests.

**Exit gate**: all six tests green; JSON committed to `public/data/`.

### Setup
- [x] T010 Scaffold `pipeline/` as a uv project (`pyproject.toml`, `uv.lock`), deps: pandas, pytest; configure ruff. `src/ghostroster_pipeline/` package layout per plan.
- [x] T011 [P] Add `pipeline/README.md` documenting `uv run` entry point and the no-BRef / Lahman-only sourcing rule.

### Download + license gate (write test first)
- [x] T012 [US1] `tests/test_license_gate.py` — asserts the downloaded edition exposes CC BY-SA license text and an edition year; fails if absent/mismatched. (Write first, see it fail.)
- [x] T013 [US1] `download.py` — fetch the current Lahman edition into `.cache/` (Lahman CSV/SQLite distribution or pybaseball's Lahman loader; **never BRef/MLB-API**); extract license text + edition year; write `public/data/ATTRIBUTION.json`; raise on license mismatch.

### Transform
- [x] T014 [P] [US1] `eligibility.py` — per (franchise, decade): hitters ≥80 G **and ≥200 PA**, SP ≥20 GS, RP ≥30 relief app; compute per-cell counts; drop cells below the ≥9H/≥3SP/≥1RP floor. (Flagged tuning thresholds, tightened to everyday-regular / true-rotation levels — excludes small-sample cheat-code rates. `emit.py` clears stale chunks each run so output == emitted set.)
- [x] T015 [P] [US1] `stats.py` — select each player's **best single season** with that team in that decade; build the `display` block (raw line) per data-model.
- [x] T016 [US1] `vectors.py` — era-adjusted, league-relative `OutcomeVector` for hitters (HBP→BB) and pitchers (from BB/H/HR/IP; 2B/3B-allowed via league split); pitcher `stamina`. (depends on T015)

### Emit (deterministic)
- [x] T017 [US1] `emit.py` — write `teams.json` + `td/{franchiseId}-{decade}.json` with sorted keys, stable row order, fixed float rounding. `run.py` orchestrates download→eligibility→stats→vectors→emit.

### Acceptance checks as automated tests
- [x] T018 [P] [US1] `tests/test_payload_size.py` — acceptance check 1 (total `public/data/` < 20 MB) + check 2 (every `td/*.json` < 100 KB).
- [x] T019 [P] [US1] `tests/test_eligibility_floor.py` — acceptance check 3 (every `teams.json` cell has ≥9H/≥3SP/≥1RP; sub-floor cells absent).
- [x] T020 [P] [US1] `tests/test_known_vectors.py` — acceptance check 4 — logic verified vs. hand-computed Babe Ruth 1921 fixture. (Open hardening follow-up tracked as T023.)
- [x] T021 [P] [US1] `tests/test_determinism.py` — run pipeline twice → byte-identical JSON.
- [x] T022 [US1] Run full pipeline on the real (lahman-2025) edition; commit `public/data/` (commit dc33ae3). **M1 exit gate met** — 4 acceptance checks + determinism + license gate green against the real edition (payload 9.74 MB, max chunk 60.8 KB, 270 cells emitted / 233 below floor).
- [ ] T023 [US1] (hardening, open) Add 5 real-player spot-check vectors to `tests/test_known_vectors.py` against the committed real edition — T020 currently covers only the synthetic Ruth fixture.

---

## M2 — Sim engine + tuning ✅ DONE (4 days) — the risk milestone · [US1][US2]

**Goal**: Pure seeded `simulateSeason(roster, opponent, seed)` producing record +
box scores + highlights, hitting the tuning targets.

- [x] T030 Node LTS + TypeScript toolchain (`package.json`, `tsconfig.json` strict, vitest); `src/sim/` package. Framework-free — Next.js arrives at M3 (T040).
- [x] T031 [US1] mulberry32 RNG module (`src/sim/rng.ts`) + `hashSeed` for the daily seed; golden-master test pinning exact sequences (constitution II cross-browser reproduction).
- [x] T032 [US1] PA resolver (`src/sim/resolve.ts`): odds-ratio (log5) batter×pitcher÷league blend + seeded `sample`; `src/sim/baseline.ts` NEUTRAL baseline pinned to the pipeline's `vectors.py` + v1 league-average `OpponentModel`. Plus `src/sim/types.ts` (data-model mirror).
- [x] T033 [US1] 24-state base-out machine (`src/sim/baseout.ts`) + the fixed/documented advancement table (data-model); `playHalfInning` to 3 outs. (Extra-innings continuation lives in T034 game assembly.)
- [x] T034 [US1] `src/sim/game.ts` (full-game assembly: SP innings 1–6, RP 7+, full-9 both sides + extras) and `src/sim/season.ts` `simulateSeason(roster, opponent, seed)` cycling SP1→SP2→SP3 over 162 games. Pure/seeded entry point + roster validation. (Walk-off/skip-bottom-9 omitted — flagged simplification.)
- [x] T035 [US2] Box-score bookkeeping in `game.ts` (line scores, per-slot batting lines with runner-id run attribution) + `computeHighlights`/`computeGrade` in `season.ts`. Grade scale is the flagged default (last cut-order item).
- [x] T036 [US1] Golden-master tests (`tests/golden.test.ts` + `tests/fixtures.ts`): fixed roster+seed → pinned record (127-35), season digest, and highlights. Cross-browser RNG reproduction guaranteed by the pinned mulberry32 stream (`rng.test.ts`) + int-only arithmetic (SC-003).
- [x] T037 Performance test (`tests/perf.test.ts`): 162-game season ~3 ms/season on dev (<<2s phone budget); asserts a 50 ms/season ceiling to catch regressions.
- [x] T038 Calibration harness `pipeline/tuning/calibrate.ts` (TS, runs the shipped sim — single source of truth) + `calibration-report.md` + `calibration.json`. **Bridge decision: resolved as a TS harness** (no Python notebook — avoids reimplementing the sim). Results: SC-004.1 ✅ (.497 win%, ~4.1 R/G), SC-004.3 ✅ (83.5% of best-pick drafts in 145–158), SC-004.2 ◑ (162-0 at 0.68%, just under 1–3%). Finding: offense levers don't move the 162-0 rate (variance-gated) — left advancement table/z-score at defaults; harness under-measures optimal play by ignoring re-rolls (flagged follow-up). No sim distortion.

---

## M3 — UI: spin → draft → result, Classic ✅ DONE (3 days) · [US1]

- [x] T040 Next.js 16 static-export (`output: 'export'`) app shell under `src/app/`; Tailwind v4 with vintage scoreboard theme tokens (`globals.css`); routes `/` (landing), `/play` (the run), `/daily` (stub); `Footer` attribution component on every screen (FR-011); Roboto Slab + JetBrains Mono via `next/font`. Static build verified: 4 routes, ~900 KB assets (<5 MB), 270 data chunks copied to `out/`. tsc + 46 tests still green.
- [x] T041 [US1] Slot-machine reveal over `teams.json` (`SpinAnimation.tsx`, reduced-motion aware) that auto-advances to the roster page. The two per-run re-rolls live on the roster page (replay the reel animation): **team re-roll → different franchise, SAME decade; decade re-roll → different decade, SAME franchise** (each consumed/disabled; gated by `canRerollTeam`/`canRerollEra`). Pure spin helpers `lib/spin.ts` (+tests), `lib/data.ts` loader, `RunContainer.tsx` run-state host. Browser-verified (e.g. 1970s SD Padres → 1970s Washington Nationals on team re-roll).
- [x] T042 [US1] `lib/data.ts` lazy-loads + caches each spun `td/*.json` chunk; `lib/storage.ts` persists the in-progress run (picks + rerolls) to localStorage and resumes on reload (SSR-safe). Browser-verified: reload mid-run resumes at the right round with picks intact.
- [x] T043 [US1] Draft/roster screen (`DraftScreen.tsx`): 13-round spin↔pick loop, **Hitters/Pitchers toggle**, pools sorted best-first with best-season stat lines, one-tap pick+auto-slot (`lib/draft.ts` — **strict positions: a player greys out ("slot full") unless one of their positions or DH is open; no off-position fallback**, +tests), persistent `RosterSidebar`, needs counter, dup prevention, and a **free re-spin escape** when no player fits an open slot. `buildSimRoster` assembles the 9/3/1 sim roster (lineup batted in descending OPS). Browser-verified end-to-end.
- [x] T044 [US1] Simulate screen (`SimulateScreen.tsx`): skippable, reduced-motion-aware season ticker (W-L climb + progress) → `simulateSeason(buildSimRoster(picks), LEAGUE_AVERAGE_OPPONENT, seed)` (seed persisted for reproducibility) → result.
- [x] T045 [US1] Result screen (`ResultScreen.tsx`): record + letter-grade seal + 13-man roster card with era tags (`RosterSidebar`) + one highlight beat + one generated quip (`lib/result.ts`, +8 tests). Browser-verified (e.g. 132-30, grade C, reproducible across reload).
- [x] T046 Full run verified playable end-to-end in-browser (spin→draft→sim→result, resume + reproducibility); static build OK; page weight 929 KB (<5 MB); teams.json 36 KB, largest lazy chunk 59 KB (<100 KB); season ~3 ms (<2s). 73 tests green.

---

## M4 — Box scores, share cards, daily ✅ DONE (2.5 days) · [US2][US3]

- [x] T050 [US2] Box scores (`BoxScores.tsx`): 162-game season log (W/L, score, no-hitter flag) → tap any game for its vintage line score (inning-by-inning + R/H, League Avg vs Ghosts) + your batting lines (AB/R/H/HR/RBI/BB) in OPS order. Entry from ResultScreen. Browser-verified.
- [x] T051 [US2] On-device share card (`lib/share.ts`): renders a 1080×1350 vintage canvas (wordmark, record, grade seal, 13-man roster with era tags, highlight, quip, attribution) → native Web Share with the PNG where supported, download fallback otherwise (no server). ResultScreen "Share" shows an inline preview + Save/share. Browser-verified (card renders).
- [x] T052 [US3] Daily mode (`lib/daily.ts` + `RunContainer mode="daily"` at `/daily`): date-derived **deterministic spins** (seeded per round/event) + sim seed `hash(salt+YYYY-MM-DD)` — same challenge for everyone. "Daily · Ghost Roster #N" badge; result persisted to localStorage (`saveDailyResult`). **Replay allowed** (operator decision, supersedes one-attempt). Browser-verified: two loads land the same team-decade; daily seed yields a distinct record from classic.
- [x] T053 [US3] Spoiler-safe share (`dailyShareText`/`spoilerSquares` + `shareDaily`): "Ghost Roster #N", record · grade, 18 emoji squares (9-game stretches), link — **no roster**. ResultScreen swaps to a text share + visible squares preview in daily mode. (Clipboard fallback blocked only inside the preview iframe; text is selectable.)

---

## M5 — Polish, analytics, deploy (1.5 days) · all · code/docs done, operator actions remain

- [x] T060 (code) `Analytics.tsx` — Plausible-class, cookie-less; ships **inert** until `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set at build. ⏳ operator: create the site + set the env var.
- [x] T061 Attribution/disclaimer footer audited on every screen (root layout): Lahman/SABR + CC BY-SA + Negro-Leagues-excluded + MLB/MLBPA disclaimer + FR-012 text-only + tip jar. Browser-verified.
- [x] T062 (config) `next.config` static export + `.nvmrc` (22) + `public/_headers` (caching) + `DEPLOY.md` (Cloudflare Pages settings). ⏳ operator: connect repo in Cloudflare, add custom domain.
- [x] T063 (draft) `docs/portfolio-writeup.md` — spec→ship narrative + launch-post drafts. ⏳ operator: register ghostroster.app (D-006), set the real tip-jar URL, post.

---

## Dependencies & cut order

- M1 blocks all (sim + UI consume its JSON). M2 blocks M3/M4 (UI needs the sim). M5 last.
- Within M1: T013→T014/T015→T016→T017→(T018–T021)→T022. T012 before T013.
- **De-scope path (apply in order, never extend budget):** T044 season ticker → T045 quips → T050 box-score depth (keep line scores) → grade (record only).

## Flagged tuning items (carried, not resolved)

Hitter eligibility ≥80 G **+ ≥200 PA** & pitcher/RP usage (SP ≥20 GS, RP ≥30) (T014,
T034); 2B/3B-allowed league split (T016); z-score fallback + advancement table
(T038); grade scale (T035/T045); "best team today" solver (P1, out of v1);
ghostroster.app + handles (T063, Justin).

---

## v1.1 — post-launch enhancements (in progress) · [US1][US2]

Player-feedback batch; see `docs/decision-log.md` D-009 and `~/.claude/plans/`.

- [ ] T070 [US1] Position picker — `lib/draft.ts` `ownOpenSlots()` + `draftHitter(…, slot?)`; `DraftScreen` inline slot chooser when a hitter has ≥2 of their own positions open (else auto-slot); `RunContainer` forwards the chosen slot. +tests.
- [ ] T071 [US2] Satirical quote engine — `lib/result.ts` `quip → {quote, author}`, ~30–40 writerly-dry attributed lines (real iconic legends, praise + sharper sting, weave specifics, deterministic pick). `ResultScreen` + `share.ts` render the attribution. +tests.
- [ ] T072 [US1] Two re-rolls each — `RunContainer` cap → 2, daily RNG keys indexed per re-roll; `DraftScreen` chip shows remaining (2→0). +tests.
- [ ] T073 [US1][US2] All-Star / HOF — pipeline (`tables.py` +AllstarFull/HallOfFame, `emit.py` season-AS + career-HOF flags), `conftest` fixture, regenerate `public/data`; `lib/types.ts` `allStar`/`hof`; UI name-styling (gold HOF + ★ All-Star) on draft rows, roster card, result. `data-model.md` updated.
- [ ] T074 Run `/speckit.analyze`; verify (pipeline determinism, tsc, tests, build, browser mobile+desktop); commit per change; push.
