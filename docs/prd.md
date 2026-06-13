# PRD — Ghost Roster (formerly working title "Perfect Season")

**Status:** DRAFT v1 — D-001 through D-005 decided 2026-06-12 (see `decision-log.md`). Remaining open: D-006 (name), D-007 (Negro Leagues), D-008 (monetization).

## Problem statement

Five baseball clones of 82-0 shipped within a week of the original going viral, and every one replicates its shallow rating-threshold model: a W-L number falls out of an opaque formula. None simulates actual baseball. The gap: a game where 1927 Ruth *actually bats* against an era-adjusted pitcher, plate appearance by plate appearance, producing box scores, streaks, and season stories you can argue about — not just a record. Ghost Roster fills that gap with a Markov PA-level sim (D-001/D-003), built publicly as a spec→ship Claude Code portfolio piece (D-001 option D).

## Goals

1. Ship a playable v1 in **~12–15 build-days** (expanded from 5–10 by explicit decision; see D-004).
2. ≥ N% of completed runs end in a share action (the loop's viral mechanic works). *(Set N after first week of data.)*
3. ≥ N% day-7 return rate on daily challenge players (durability beyond the spike).
4. Produces a demonstrable Agentic-PM portfolio artifact: public writeup of spec→ship with Claude Code. **This goal is met even if 2–3 underperform.**

## Non-goals (v1)

- Mobile native app — browser-first, responsive; app only if retention earns it.
- User accounts — unless leaderboard design forces it (prefer anonymous + local storage).
- Multi-sport expansion — 20-0.com owns that position; we don't chase it.
- Monetization — tip jar only (D-008, decided).
- Negro Leagues content — excluded from v1 (D-007); data path via Lahman is ready if reopened post-launch.
- Live MLB data / current-season modes — historical only; avoids MLB API ToS exposure.

## User stories (draft)

- As a baseball fan, I want to spin for random team-decades and draft a roster in under 3 minutes so that I can play during a coffee break with zero signup.
- As a competitive fan, I want a daily challenge identical for everyone so that my result is comparable and braggable.
- As a sharer, I want a result screen designed for screenshots (roster, record, one absurd highlight) so that posting it is the natural end of a run.
- As a stats nerd, I want the simulation to behave like real baseball (era-adjusted PA-level outcomes, box scores I can inspect) so that arguing with the result is fun instead of arbitrary. ✅ (D-003: Markov sim)
- As a returning player, I want to see my streak/history so that the daily becomes a habit. (P1)

## Requirements

### P0 — cannot ship without
- [ ] Spin mechanic: independent random franchise + decade; eligibility = ≥ N games with that team in that decade (162-0.net uses 20 — validate; pitchers need their own threshold, e.g. ≥ N IP or starts)
- [ ] Draft flow: **13 picks — 9 hitters + 3 SP + 1 RP** (D-002); pick+slot in one action; limited skips (one team skip, one era skip)
- [ ] Simulation: **Markov PA-level sim** (D-003); league-relative era adjustment; 3-man rotation cycling + simple RP usage rule; pure seeded function (rosterA, rosterB?, seed) → result; 162-game season client-side < 2s
- [ ] **Box score / season output** (moved from P1 per D-004): per-game box scores browsable, season highlights (streaks, no-hitters, best/worst game) on result screen
- [ ] Result screen: record + grade + roster card + one season story beat, optimized for screenshot/share (native share API + copy-image)
- [ ] Daily challenge: deterministic seed per date, one attempt, local-storage result, spoiler-safe share format
- [ ] Data pipeline: Lahman → static JSON (hitters + pitchers) with attribution; lazy-load chunks < 100 KB (D-005)
- [ ] Tuning notebook: 10K-run record distribution; god-tier draws can hit 162-0, great-but-flawed rosters land 145–158
- [ ] Mobile-responsive; total page weight < 5 MB excluding lazy data chunks (per kickoff brief); playable on a phone over cellular

### P1 — fast follows
- [ ] Blind/IQ mode (stats hidden)
- [ ] Daily leaderboard (forces a small backend or edge KV — scope per D-005: deferred until this lands)
- [ ] Streak tracking
- [ ] Richer season narrative (play-by-play text, generated quips beyond v1's highlight beats)

### P2 — architectural insurance
- [ ] Head-to-head (async roster vs. roster) — design the sim as a pure function (rosterA, rosterB?, seed) → result so PvP is a composition, not a rewrite
- [ ] Negro Leagues expansion path (D-007)
- [ ] Additional player pools (D-001 option C territory)

## Success metrics

Leading: completion rate of started runs, share rate, daily-challenge participation. Lagging: D7 retention, organic referral share. Set numeric targets after first week live. Measurement: privacy-light analytics (Plausible-class) — no invasive tracking on a fan toy. Portfolio goal (#4) measured by: public writeup shipped + repo demonstrable in job-search conversations.

## Open questions

- **Blocking:** none — all of D-001–D-008 decided 2026-06-12.
- Non-blocking: Justin registers ghostroster.app + social handles (time-sensitive); skip-mechanic tuning; grade scale (A+ etc. vs. record only); pitcher eligibility threshold (IP/starts per team-decade); RP usage rule design; whether "best possible team today" reveal post-daily (strong dopamine, costs a solver).

## Timeline considerations

- Working budget: **~12–15 build-days** (D-004). Virality half-life has likely passed (~9 days post-82-0 launch); the bet is the durable loop + portfolio value, not the wave.
- Sequencing: data pipeline spike (validate static-JSON size incl. pitchers) → Claude Code kickoff brief (03_technical/) → build M1–M5 per architecture-options.md outline.
