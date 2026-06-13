# Claude Code startup — files + initial prompt

## Files to copy into the repo (as `docs/`)

| Workspace file | Repo destination | Why |
|---|---|---|
| `03_technical/claude-code-kickoff-brief.md` | `docs/kickoff-brief.md` | The implementation contract — primary input |
| `02_product/decision-log.md` | `docs/decision-log.md` | Rationale behind every constraint; stops re-litigation |
| `02_product/game-design-notes.md` | `docs/game-design-notes.md` | Tuning philosophy, advancement table thinking, shareability spec |
| `01_research/data-sources.md` | `docs/data-sources.md` | Licensing constraints + attribution text + era-adjustment options |
| `02_product/prd.md` | `docs/prd.md` | User stories, P0/P1/P2 tiers, non-goals (optional but cheap) |

Not needed: competitive-landscape (strategy, not build), architecture-options (superseded by the brief), distribution-notes (launch-time, fetch later).

**These are snapshots.** The Cowork workspace decision log remains the source of truth for decisions; if anything changes mid-build, change it there first.

## Setup sequence

```
mkdir ~/dev/ghostroster && cd ~/dev/ghostroster
# copy the docs/ files in
uvx --from specify-cli specify init . --ai claude   # spec-kit bootstrap
claude                                              # then enter plan mode
```

## Initial prompt (plan mode)

Paste this as your first message:

---

Read everything in `docs/` before responding — start with `docs/kickoff-brief.md`, which is the implementation contract for this project.

Context: Ghost Roster is a browser game — spin for a random MLB franchise + decade, draft 13 players (9 hitters, 3 SP, 1 RP), and a Markov-chain plate-appearance-level simulation plays your roster through a 162-game season. Goal: 162-0. All product and architecture decisions (D-001–D-008) are already made and documented in `docs/decision-log.md`. **Treat them as fixed constraints, not open questions — do not propose alternatives to decided items.**

This repo uses GitHub Spec Kit. Plan the following, in order:

1. Repo bootstrap: git init, GitHub repo creation (`gh repo create ghostroster --private`), .gitignore, repo CLAUDE.md derived from the brief's constraints (budget, cut order, no Baseball-Reference scraping anywhere including dev scripts, sim must stay a pure seeded side-effect-free function, Lahman CC BY-SA attribution).
2. Spec Kit phases: draft the constitution from the non-negotiables above; then map the brief onto /speckit.specify and /speckit.plan inputs. The brief's §6 milestones (M1 pipeline → M2 sim → M3 UI → M4 share/daily → M5 deploy, ≈13 days) should structure /speckit.tasks.
3. M1 in detail (first milestone, ~2 days): Python pipeline (`/pipeline`, uv + pandas) that downloads the current Lahman edition, verifies its license text, and emits `public/data/teams.json` + per-team-decade chunks per the schema in brief §3, with the four acceptance checks as automated tests.

Constraints to honor in the plan: budget is 12–15 build-days total with the explicit cut order in brief §6 — if your plan exceeds it, cut scope per that order rather than extending. Flag (don't resolve) the open tuning items listed at the end of the brief.

Output: a milestone-by-milestone plan with day estimates, then we'll review before any implementation.

---

## After plan approval

- Verify the plan's day estimates still sum ≤ 15; if not, invoke the cut order.
- First commit should include `docs/`, constitution, and CLAUDE.md before any code.
- Register ghostroster.app before M5 if not done already (time-sensitive).
