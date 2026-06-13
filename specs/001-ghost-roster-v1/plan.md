# Implementation Plan: Ghost Roster v1

**Branch**: `001-ghost-roster-v1` | **Date**: 2026-06-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-ghost-roster-v1/spec.md`; implementation contract `docs/kickoff-brief.md`; decisions `docs/decision-log.md` (D-001–D-008).

## Summary

Ghost Roster is a no-signup browser game: spin a random MLB franchise+decade, draft 13 players (9H/3SP/1RP) one team-decade at a time, then run a Markov plate-appearance-level simulation of a 162-game season client-side and chase 162-0. Technical approach (D-005): a Next.js static export with all logic on the client, fed by committed static JSON that an offline Python pipeline derives from the Lahman Database. The simulation is a pure, seeded, side-effect-free function — both the determinism guarantee and the P2 PvP insurance.

## Technical Context

**Language/Version**: Pipeline — Python 3.12 (uv-managed). Frontend/sim — TypeScript on Node LTS (introduced at M2).

**Primary Dependencies**: Pipeline — pandas, pytest (+ optionally pybaseball's *Lahman* loader, pipeline-side only). Frontend — Next.js (static export), React; canvas API for share images; a small seeded-RNG implementation (mulberry32).

**Storage**: No backend. Static JSON in `public/data/` (`teams.json` + `td/{franchiseId}-{decade}.json`). Player-facing state (in-progress run, daily result/history) in browser local storage.

**Testing**: pytest for the pipeline (acceptance checks + determinism + license gate); the sim's golden-master, distribution, and cross-browser RNG tests on the JS side (M2). TDD where it pays: pipeline acceptance checks and sim golden masters are written as executable gates.

**Target Platform**: Modern mobile + desktop browsers; mobile-first; offline-tolerant after first load. Deploy target: Cloudflare Pages free tier.

**Project Type**: Static web app + offline data pipeline (no server).

**Performance Goals**: 162-game season < 2s on a mid-range phone; each data chunk < 100 KB; total `public/data/` < 20 MB; page weight < 5 MB excluding lazy chunks.

**Constraints**: No backend in v1. Deterministic pipeline (byte-identical output for a fixed Lahman edition). Pure seeded sim. Lahman CC BY-SA attribution on every screen. No Baseball-Reference scraping or MLB API anywhere. Text-only franchises. Budget 12–15 build-days with a fixed cut order.

**Scale/Scope**: ~30 franchises × ~13 decades → on the order of hundreds of eligible team-decade cells; 13-pick draft; 5 screens (Spin, Draft, Simulate, Result/Box scores, Daily).

## Constitution Check

*GATE: must pass before and after design. See `.specify/memory/constitution.md`.*

| Principle | Plan compliance |
|---|---|
| I. Decisions are fixed | Plan instantiates D-001–D-008; proposes no alternatives to decided items. ✅ |
| II. Pure seeded sim | `simulateSeason(roster, opponent, seed)` is the only sim entry point; no I/O, no globals, mulberry32 RNG; opponent is a parameter for PvP composition. ✅ |
| III. Licensing & attribution | Lahman-only sourcing with a build-time license gate; attribution footer is an FR on every screen; text-only franchises; no BRef/MLB-API path. ✅ |
| IV. Static-first, no backend | Next.js static export + committed JSON + local storage; edge KV explicitly deferred to the P1 leaderboard. ✅ |
| V. Determinism end-to-end | Pipeline emits sorted/stable/rounded JSON with a pinned edition; sim reproducible from (roster, opponent, seed); golden-master + determinism tests. ✅ |
| VI. Budget + cut order | Milestones sum to 13.5 days; cut order encoded in tasks as the de-scope path. ✅ |
| Performance gates | <2s season, <100 KB/chunk, <20 MB payload, <5 MB page are tracked as acceptance criteria. ✅ |

**Result**: PASS — no violations; Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-ghost-roster-v1/
├── spec.md              # WHAT/WHY (done)
├── plan.md              # This file
├── data-model.md        # JSON schema + sim types + advancement table
├── tasks.md             # Milestone-structured task list (M1–M5)
└── checklists/
    └── requirements.md   # Spec quality checklist (passed)
```

### Source Code (repository root)

```text
pipeline/                 # M1 — Python (uv + pandas), offline
├── pyproject.toml
├── uv.lock
├── src/ghostroster_pipeline/
│   ├── download.py       # fetch current Lahman edition + license gate
│   ├── eligibility.py    # team-decade eligibility floors
│   ├── stats.py          # best-single-season selection + display block
│   ├── vectors.py        # era-adjusted, league-relative sim vectors
│   ├── emit.py           # deterministic teams.json + td/*.json writers
│   └── run.py            # pipeline entry point
├── tests/
│   ├── test_payload_size.py        # acceptance check 1 (<20 MB) + 2 (<100 KB)
│   ├── test_eligibility_floor.py   # acceptance check 3
│   ├── test_known_vectors.py       # acceptance check 4 (5 spot-checks)
│   ├── test_determinism.py         # byte-identical re-run
│   └── test_license_gate.py        # CC BY-SA verification
├── tuning/               # M2 — tuning notebook (run environment / 162-0 band)
└── .cache/               # raw Lahman download (gitignored)

public/data/              # committed generated JSON (NOT gitignored)
├── teams.json
├── ATTRIBUTION.json      # edition year + license text captured at build
└── td/{franchiseId}-{decade}.json

src/                      # M2–M4 — Next.js app + pure sim (added later)
├── sim/                  # pure seeded simulateSeason + RNG + box scores
├── app/                  # routes: spin, draft, simulate, result, daily
├── components/
└── lib/                  # data loading, local storage, share-image canvas
tests/                    # sim golden-master, distribution, RNG cross-browser
```

**Structure Decision**: Two cooperating trees in one repo — a Python `pipeline/` that produces committed JSON, and a TypeScript `src/` static app that consumes it. The boundary is the JSON contract in `data-model.md`; nothing at runtime crosses back into Python. M1 builds only `pipeline/` + `public/data/`; `src/` arrives at M2.

## Milestone → User-story mapping

The brief's §6 milestones drive `tasks.md` (per the kickoff prompt). Each milestone advances specific spec user stories:

| Milestone | Days | Advances | Exit gate |
|---|---|---|---|
| M1 Pipeline | 2 | (foundation for all) | 4 acceptance checks + determinism + license gate green; JSON committed |
| M2 Sim + tuning | 4 | US1 (sim), US2 (box scores) | golden-master + RNG tests green; tuning targets met (SC-004) |
| M3 UI Classic | 3 | US1 (spin/draft/result) | full run playable; <2s season; <5 MB page |
| M4 Box scores / share / daily | 2.5 | US2, US3 | box scores browsable; on-device share; daily seed + spoiler-safe share |
| M5 Polish / deploy | 1.5 | all | analytics live; deployed to Cloudflare Pages; attribution on every screen |

Total: 13.5 build-days (within 12–15). **Cut order if exceeded:** season ticker animation → generated quips → box-score depth (keep line scores) → grade system (record only). P0 (sim, draft, daily, attribution) is never cut.

## Complexity Tracking

> No constitution violations — section intentionally empty.
