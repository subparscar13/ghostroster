# Feedback — gather & triage

Working doc for the friends-feedback round. Paste raw feedback into **Intake**, then
sort it with the **Rubric**. Keep the bar the same as the build: P0 already shipped;
new asks are P1/P2 or small polish, and anything that threatens scope goes through
`decision-log.md` first (don't expand v1 — cut or defer).

## How friends report
- **In-app:** the footer "feedback" link (→ GitHub issue form, or a Google Form — see
  the channel note at the bottom).
- **Casual:** a text/DM is fine — paste it into Intake below and I'll triage it.

## Rubric

**Category:** `bug` · `ux` (confusing/friction) · `balance` (too hard/easy) · `idea`
(new feature) · `copy` (wording) · `perf`.

**Severity:** `S1` blocks play / data wrong · `S2` real friction, has a workaround ·
`S3` polish / nice-to-have.

**Effort:** `E1` < ~1h · `E2` a few hours · `E3` a day+ (treat as P1/P2).

**Disposition:** `now` (quick win, do it) · `P1` / `P2` (deferred, log it) ·
`watch` (need more reports to confirm it's real) · `wontfix` (with a one-line why).

Triage order: confirmed S1 bugs → cheap S2/S3 wins (E1) → cluster the rest into P1/P2.

## Seeded backlog — pre-launch playtest pass (mine, before friends weigh in)

A fresh-eyes pass on the live build. These are *predictions* — confirm/kill them
against real reports rather than acting blindly.

| # | Category | Sev | Effort | Item | Disposition |
|---|----------|-----|--------|------|-------------|
| S1 | ux | S2 | E1–E2 | Greyed "slot full" players give no reason — a friend won't know it's strict positions. Add a one-line hint or a tooltip ("position + DH filled"). | now-ish |
| S2 | ux | S2 | E2 | The spin animation replays every round (~1.3s × 13 ≈ 17s/draft) — fun once, may drag. Consider a faster per-round spin or a "skip animations" toggle (re-rolls keep the animation per your call). | watch → P1 |
| S3 | ux | S3 | E2 | Long hitter pools have no search/filter; you scroll to find a name. A filter or position-jump would help power users. | P1 |
| S4 | balance | S2 | E2 | 162-0 is very rare (~0.14% optimal) and great drafts cluster 145–160 — friends may feel "perfect is impossible" or losses feel random. This is the flagged SC-004.2 lever; gather sentiment before tuning. | watch |
| S5 | copy | S3 | E1 | A sub-.500 roster scores an "F" — may read harsh for a casual play. Grade-scale is a flagged taste lever; reword or rescale if it lands badly. | watch |
| S6 | bug | S2 | E1 | Native share / clipboard on real phones is unverified (worked in concept; the daily clipboard fell back in the test iframe). Confirm share + daily-squares copy on iOS/Android. | confirm |
| S7 | idea | S3 | E3 | No "how good was my roster vs the best possible?" reveal and no leaderboard — friends will want to compare. Both are explicitly P1. | P1 |
| S8 | idea | S3 | E3 | Daily shows no streak/history — the habit hook. P1. | P1 |

**Verified OK (don't expect these):** mobile layout (draft, box scores, result, line
score all fit at 375px); era-appropriate franchise names; data loads on the live URL;
determinism.

## Intake — paste friend feedback here

| Date | Who | Raw feedback | → Category / Sev / Disposition |
|------|-----|--------------|--------------------------------|
| | | | |

## Decisions log (what we did with feedback)

- _(none yet)_

---

**Channel note:** the footer link points at the repo's GitHub issue form
(`/issues/new`), which is structured but needs a GitHub account. For non-dev friends,
a Google Form is lower friction — create one and the footer link can point there
instead (it's a single configurable URL in `src/components/Footer.tsx`).
