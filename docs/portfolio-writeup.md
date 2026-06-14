# Ghost Roster — a spec→ship build with Claude Code

**Draft for review.** Ghost Roster is a browser game: spin a random MLB franchise +
decade, draft 13 players across baseball history (9 hitters, 3 starters, 1 reliever),
and a Markov plate-appearance simulation plays your roster through a 162-game season.
Chase 162-0. Built solo with Claude Code as a documented agentic-PM portfolio piece —
the success criterion isn't traffic, it's a demonstrable spec→ship process (D-001).

## The thesis

Five clones of "82-0" shipped within a week of it going viral; every one falls out of
an opaque rating threshold — a W-L number with no story. Ghost Roster simulates actual
baseball: 1927 Ruth *bats*, plate appearance by plate appearance, against an era-
adjusted pitcher, producing box scores, streaks, and season stories you can argue
about. The real simulation is the differentiator and the hardest thing to fast-follow.

## How it was built — decisions before code

Everything traced to a **decision log** (D-001…D-008) settled up front, then a
**constitution** that gated every spec, plan, and task. The non-negotiables:

- **The sim is a pure, seeded, side-effect-free function** — `simulateSeason(roster,
  opponent, seed)`. No I/O, no globals, no wall-clock, no `Math.random`. The opponent
  is a parameter, so PvP later is composition, not a rewrite.
- **Deterministic pipeline** — same Lahman edition in → byte-identical JSON out.
- **Static-first, no backend** — Next.js static export + committed JSON, free-tier host.
- **Licensing is load-bearing** — Lahman (CC BY-SA) only, no Baseball-Reference
  scraping anywhere including dev scripts; attribution on every screen; text-only
  franchises; Negro Leagues excluded from v1.
- **Budget discipline** — 12–15 build-days with a fixed cut order; scope is removed
  before the budget is extended.

GitHub Spec Kit turned those into a `constitution` → `spec` → `plan` → `tasks` chain,
structured by the milestones below. A `/speckit.analyze` pass caught drift between the
artifacts and reality before it compounded.

## The build, milestone by milestone

- **M1 — Pipeline (Python, uv + pandas).** Lahman → `public/data`: a license gate that
  fails the build without verifiable CC BY-SA text, era-adjusted per-PA outcome vectors
  (player rate ÷ league rate, projected onto a neutral baseline), best-single-season
  selection, and deterministic emission. Eligibility tightened to everyday regulars
  (≥80 G & ≥200 PA hitters, ≥20 GS starters, ≥30-appearance relievers) — which also
  removed small-sample "cheat-code" rates. Four acceptance checks as tests: payload
  < 20 MB, every chunk < 100 KB, every team-decade fields ≥9H/≥3SP/≥1RP, and known
  vectors match hand computation.
- **M2 — Sim engine (TypeScript).** mulberry32 RNG (32-bit-int ops → identical across
  browsers), a log5/odds-ratio PA resolver, a 24-state base-out machine with a
  deliberately dumb, documented advancement table, rotation + bullpen usage, and the
  pure `simulateSeason`. A full season runs in ~3 ms. Golden-master tests pin an exact
  record + season digest; a calibration harness runs the *shipped* sim over real
  rosters to check the SC-004 targets (run environment ~.500, near-miss band 145–158,
  perfection rare).
- **M3 — UI (Next.js, Tailwind, vintage scoreboard theme).** Spin → draft → simulate →
  result. Slot-machine reveal, 13-round draft with strict position slotting + a
  Hitters/Pitchers toggle + re-rolls, a skippable season ticker, and a result card.
- **M4 — Box scores, share, daily.** Browsable 162-game box scores; an on-device
  canvas share card (native share / download, no server); and a date-seeded daily
  challenge — deterministic spins *and* sim seed so everyone plays the same challenge,
  with a spoiler-safe emoji-square share.
- **M5 — Polish & deploy.** Attribution audit, inert-until-configured analytics, a
  Cloudflare Pages deploy path, and this writeup.

## What I'd point a reviewer at

- **The pure sim** (`src/sim/`) — deterministic, tested with a golden master, the seam
  for future PvP.
- **The calibration harness** (`pipeline/tuning/`) — it runs the real sim, so the
  tuning numbers can't drift from gameplay, and the report is honest about where the
  162-0 rate lands and *why*.
- **The decision log + constitution + Spec Kit chain** — the actual agentic-PM
  artifact: how scope stayed bounded and decisions stayed fixed.
- **~82 automated tests**, tsc strict-clean, ~900 KB page weight.

## Honest tradeoffs (flagged, not hidden)

- Strict-position 162-0 lands ~0.14% of optimal best-pick runs (under the 1–3% guide) —
  a consequence of removing cheat-code players; the harness also under-measures optimal
  play (no re-rolls / OPS-sorted lineups), so it's a floor. Documented in the
  calibration report.
- Franchise display uses each franchise's *current* name (e.g. the 1990s Expos show as
  "Washington Nationals") — consistent and text-only-safe, era-mismatched on purpose.
- Grade scale is an uncalibrated default; the season-ticker and quips are the first
  cut-order items if budget bit (they didn't).

---

## Launch posts (drafts)

**X / short:**
> Built Ghost Roster: spin a random MLB franchise + decade, draft 13 ghosts across
> baseball history, and a real plate-appearance sim plays your 162-game season. Not a
> rating threshold — actual box scores. Chase 162-0. ghostroster.app

**X / process angle:**
> I built a baseball game solo with Claude Code, spec→ship: a decision log + a
> constitution that gated every task, a deterministic Python pipeline, and a pure
> seeded Markov sim with golden-master tests. Writeup + repo: [link]

**Daily-share native copy (auto-generated, spoiler-safe):**
> Ghost Roster #14
> 137-25 · C
> 🟨🟨🟩🟨🟩🟨
> 🟩🟨🟨🟩🟩🟩
> 🟨🟩🟩🟨🟩🟩
> ghostroster.app
