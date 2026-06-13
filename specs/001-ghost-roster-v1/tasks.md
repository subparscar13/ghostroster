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
- [x] T014 [P] [US1] `eligibility.py` — per (franchise, decade): hitters ≥20 G **and ≥50 PA**, SP ≥10 GS, RP ≥20 relief app; compute per-cell counts; drop cells below the ≥9H/≥3SP/≥1RP floor. (Thresholds are flagged tuning defaults; the ≥50 PA floor was added during M1 to keep pitchers/deep-bench players with tiny-sample rate vectors out of the hitter pool — commit dc33ae3.)
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

## M2 — Sim engine + tuning (4 days) — the risk milestone · [US1][US2]

**Goal**: Pure seeded `simulateSeason(roster, opponent, seed)` producing record +
box scores + highlights, hitting the tuning targets.

- [x] T030 Node LTS + TypeScript toolchain (`package.json`, `tsconfig.json` strict, vitest); `src/sim/` package. Framework-free — Next.js arrives at M3 (T040).
- [x] T031 [US1] mulberry32 RNG module (`src/sim/rng.ts`) + `hashSeed` for the daily seed; golden-master test pinning exact sequences (constitution II cross-browser reproduction).
- [x] T032 [US1] PA resolver (`src/sim/resolve.ts`): odds-ratio (log5) batter×pitcher÷league blend + seeded `sample`; `src/sim/baseline.ts` NEUTRAL baseline pinned to the pipeline's `vectors.py` + v1 league-average `OpponentModel`. Plus `src/sim/types.ts` (data-model mirror).
- [x] T033 [US1] 24-state base-out machine (`src/sim/baseout.ts`) + the fixed/documented advancement table (data-model); `playHalfInning` to 3 outs. (Extra-innings continuation lives in T034 game assembly.)
- [ ] T034 [US1] Rotation cycling (SP1→3) + RP innings 7–9; 162-game season assembly.
- [ ] T035 [US2] Box-score bookkeeping: line scores, batting lines, season highlights, grade.
- [ ] T036 [US1] Golden-master tests (fixed seed+roster → exact record + box-score hash) + cross-browser RNG reproduction test.
- [ ] T037 Performance test: 162-game season < 2s (mid-range phone budget).
- [ ] T038 Tuning notebook in `pipeline/tuning/`: 10K optimal-play runs; calibrate to SC-004 (run env ±10%, 162-0 top 1–3%, 145–158 band). Tune advancement table only if run env fails; document the z-score fallback decision. **Bridge decision (resolve at T030):** the notebook is Python but the sim is TS — run the TS sim under Node to emit a run-distribution JSON the notebook consumes, vs. doing calibration in TS. Decide before building the harness.

---

## M3 — UI: spin → draft → result, Classic (3 days) · [US1]

- [ ] T040 Next.js static-export app shell; route skeleton (spin/draft/simulate/result/daily); attribution footer component on every screen.
- [ ] T041 [US1] Spin screen: slot-machine animation over `teams.json`; 1 team + 1 era re-roll.
- [ ] T042 [US1] Lazy chunk loader for `td/*.json`; local-storage in-progress run state.
- [ ] T043 [US1] Draft screen: 13 rounds, eligible players w/ best-season stats, pick+slot in one action, persistent roster sidebar.
- [ ] T044 [US1] Simulate screen: skippable season ticker → invoke sim → result.
- [ ] T045 [US1] Result screen: record + grade + roster card (team-decade tags) + one highlight + one quip.
- [ ] T046 Verify full run playable; **time a cold full run (spin→draft→result) against SC-001's <3 min**; page weight < 5 MB; season < 2s on device.

---

## M4 — Box scores, share cards, daily (2.5 days) · [US2][US3]

- [ ] T050 [US2] Box-score views: season game log → any game's line score + batting lines.
- [ ] T051 [US2] Canvas-rendered downloadable result image (on-device) + native share API.
- [ ] T052 [US3] Daily mode: `hash(salt + YYYY-MM-DD)` seed; one attempt; local-storage result + history.
- [ ] T053 [US3] Spoiler-safe daily share (record + grade + emoji squares, no roster).

---

## M5 — Polish, analytics, deploy (1.5 days) · all

- [ ] T060 Plausible-class privacy-light analytics (completion, share, daily participation).
- [ ] T061 Final attribution/disclaimer audit on every screen; tip-jar link; **confirm FR-012 text-only (no logos/marks/photos) across all screens**.
- [ ] T062 Deploy to Cloudflare Pages (static export); verify offline-after-load.
- [ ] T063 Launch posts + portfolio writeup (spec→ship). *(Prereq: ghostroster.app registered — Justin's action, time-sensitive.)*

---

## Dependencies & cut order

- M1 blocks all (sim + UI consume its JSON). M2 blocks M3/M4 (UI needs the sim). M5 last.
- Within M1: T013→T014/T015→T016→T017→(T018–T021)→T022. T012 before T013.
- **De-scope path (apply in order, never extend budget):** T044 season ticker → T045 quips → T050 box-score depth (keep line scores) → grade (record only).

## Flagged tuning items (carried, not resolved)

Hitter eligibility ≥20 G **+ ≥50 PA** floor & pitcher/RP usage defaults (T014,
T034); 2B/3B-allowed league split (T016); z-score fallback + advancement table
(T038); grade scale (T035/T045); "best team today" solver (P1, out of v1);
ghostroster.app + handles (T063, Justin).
