# Feature Specification: Ghost Roster v1

**Feature Branch**: `001-ghost-roster-v1`

**Created**: 2026-06-12

**Status**: Draft

**Input**: Ghost Roster v1 per `docs/kickoff-brief.md` (implementation contract) and `docs/decision-log.md` (D-001–D-008, fixed).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Spin, draft, and simulate a season (Priority: P1)

A baseball fan opens the game with no signup, taps once to spin a slot machine that lands on a random MLB franchise + decade, and over 13 rounds drafts a roster of 9 hitters, 3 starting pitchers, and 1 reliever — picking a player from the spun team-decade's eligible pool and assigning a roster slot in a single action. They then watch a brief, skippable season ticker and land on a result screen showing their 162-game win-loss record. The goal is the elusive 162-0.

**Why this priority**: This is the core loop and the entire product. Without spin → draft → simulated season → result, there is no game. It is the MVP — everything else enriches it.

**Independent Test**: Start a run, complete 13 picks, simulate, and confirm a 162-game record appears that is reproducible for a given roster + seed. Delivers the complete "play a season" experience on its own.

**Acceptance Scenarios**:

1. **Given** a fresh session, **When** the player taps spin, **Then** a random (franchise, decade) cell from the eligible spin index is revealed, with one team re-roll and one era re-roll available for the run.
2. **Given** a spun team-decade, **When** the player views the draft round, **Then** the eligible players for that team-decade are shown with their best-season stats (Classic mode), and the player can pick a player and assign a roster slot in one action.
3. **Given** 13 completed picks (9 hitters, 3 SP, 1 RP), **When** the player simulates, **Then** the same roster + seed always produces the identical 162-game record and box scores.
4. **Given** a roster mid-draft, **When** the player looks at the sidebar, **Then** the filled and unfilled roster slots are persistently visible.

---

### User Story 2 - Inspect the season and share the result (Priority: P1)

After simulating, the player sees a result screen built to be screenshotted: record headline, a letter grade, a 13-man roster card tagged by team-decade, one season highlight (e.g. longest streak, a no-hitter, best/worst game), and one generated quip. They can tap into box scores — a browsable season game log, and any game's line score with batting lines. A one-tap native share and a downloadable canvas-rendered image let them post the run.

**Why this priority**: Sharing is the growth loop and box scores are the differentiation thesis (real simulation, not an opaque number). Both are explicit P0 in the PRD.

**Independent Test**: From a completed season, open the result screen, drill into at least one game's box score, and produce a share image — all client-side, no network round-trip required.

**Acceptance Scenarios**:

1. **Given** a completed season, **When** the result screen renders, **Then** it shows record, grade, the 13-man roster card with team-decade tags, one highlight, and one quip.
2. **Given** the result screen, **When** the player taps into box scores, **Then** they can browse the 162-game season log and open any game's line score and batting lines.
3. **Given** the result screen, **When** the player shares, **Then** a native share is offered and a downloadable image is generated entirely on-device.

---

### User Story 3 - Play the daily challenge (Priority: P1)

A returning player opens the daily challenge: the same seed for everyone that day, one attempt, with the result stored locally. The shareable output is spoiler-safe — record, grade, and emoji squares, with no roster reveal — so results are comparable and braggable without spoiling the draft.

**Why this priority**: The daily is the habit/retention mechanic and is P0 in the PRD. It reuses the same pure sim with a date-derived seed, so it is low marginal cost over Stories 1–2.

**Independent Test**: Open the daily on a fixed date, confirm every session that day gets the identical seed, that a second attempt is blocked after one completion, and that the share text contains record + grade + squares but no roster.

**Acceptance Scenarios**:

1. **Given** the daily challenge on a given date, **When** any player plays it, **Then** they all receive the identical seed derived from the date.
2. **Given** a completed daily run, **When** the player returns the same day, **Then** their stored result is shown and a new attempt is not allowed.
3. **Given** a completed daily run, **When** the player shares, **Then** the share is spoiler-safe (record + grade + emoji squares, no roster).

---

### Edge Cases

- A spun team-decade that cannot field a legal roster is never offered — the spin index only contains cells meeting the eligibility floor (≥ 9 hitters, ≥ 3 SP, ≥ 1 RP).
- The player exhausts both re-rolls and must draft from the current team-decade.
- The player reloads mid-run — in-progress and daily state persist in local storage so they are not silently lost.
- A new daily date arrives — the prior day's result remains in history; a fresh attempt becomes available.
- The device is offline after first load — already-loaded data and the client-side sim keep the run playable; only un-fetched team-decade chunks are unavailable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present a one-tap spin that selects an independent random franchise and decade from an eligibility-filtered index, offering exactly one team re-roll and one era re-roll per run.
- **FR-002**: System MUST run a 13-round draft (9 hitters across fielding slots DH-loose, 3 starting pitchers, 1 reliever), showing the spun team-decade's eligible players with best-season stats and letting the player pick-and-slot in a single action.
- **FR-003**: System MUST keep the in-progress roster (filled and empty slots) visible throughout the draft.
- **FR-004**: System MUST simulate a full 162-game season as a deterministic function of (roster, opponent model, seed), producing a win-loss record, per-game box scores, and season highlights, with no dependence on external state, wall-clock, or unseeded randomness.
- **FR-005**: System MUST reproduce identical results for identical (roster, seed) inputs across browsers and runs.
- **FR-006**: System MUST present a result screen with record, letter grade, a 13-man roster card tagged by team-decade, one season highlight, and one generated quip.
- **FR-007**: Users MUST be able to browse the season game log and open any individual game's line score and batting lines.
- **FR-008**: System MUST provide one-tap native sharing and an on-device generated downloadable result image, with no server round-trip.
- **FR-009**: System MUST offer a daily challenge with a seed derived from the calendar date, identical for all players that day, limited to one attempt, with the result persisted locally.
- **FR-010**: Daily-challenge sharing MUST be spoiler-safe: record + grade + emoji squares, no roster reveal.
- **FR-011**: System MUST display an attribution footer on every screen crediting the Lahman Database / SABR, stating non-affiliation with MLB and MLBPA, and linking the tip jar.
- **FR-012**: System MUST represent franchises as text only — no logos, marks, or player photos.
- **FR-013**: System MUST source all player and league data from the Lahman Database (current edition, CC BY-SA), excluding Negro Leagues content from v1; no Baseball-Reference-scraped or MLB-API data anywhere, including build tooling.
- **FR-014**: System MUST be playable without any account or signup; player state lives in local storage only.
- **FR-015**: Era adjustment MUST be league-relative (a player's rate measured against the league rate for that season) so cross-decade rosters are comparable.

### Key Entities *(include if feature involves data)*

- **Spin Index**: The set of eligible (franchise, decade) cells available to spin; franchise identity is text only.
- **Team-Decade Pool**: For one (franchise, decade), the eligible players with their best-season display stats and the data needed to simulate them.
- **Player**: A drafted entity with a display stat line (best season with that team in that decade) and a position (hitter / SP / RP); behavior in the sim is governed by an era-adjusted outcome profile.
- **Roster**: 13 assigned slots — 9 hitters, 3 starting pitchers, 1 reliever.
- **Season Result**: The output of a simulated season — record, per-game box scores, highlights, and a grade.
- **Daily Challenge**: A date-keyed, single-attempt run with a shared seed and a spoiler-safe share format.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new player can complete a full run (spin → draft → simulated result) in under 3 minutes.
- **SC-002**: A full 162-game season completes in under 2 seconds on a mid-range phone.
- **SC-003**: The same roster and seed always produce the identical record and box scores, on any browser.
- **SC-004**: With optimal play, a god-tier roster can reach 162-0 (achievable but rare — roughly the top 1–3% of best-pick runs), while a great-but-flawed roster lands in the 145–158 win band.
- **SC-005**: Every screen shows the required attribution and disclaimer footer.
- **SC-006**: The game is fully playable on a phone over a cellular connection, with total page weight under 5 MB excluding lazy-loaded data chunks.
- **SC-007**: A completed run can end in a share action without any server interaction.
- **SC-008**: The daily challenge yields an identical seed for all players on a given date and blocks a second attempt.

## Assumptions

- Players have a modern mobile or desktop browser; no native app is provided (PRD non-goal).
- Anonymous, local-storage-only state is acceptable for v1; no accounts, leaderboard, or cross-device sync (those are P1, deferred).
- The current Lahman edition supplies sufficient eligible players per team-decade to populate a worthwhile spin index; cells below the eligibility floor are simply excluded.
- Eligibility thresholds (hitters ≥ 80 G **and ≥ 200 PA**, SP ≥ 20 starts, RP ≥ 30 relief appearances) and the letter-grade scale are reasonable defaults, flagged for tuning rather than treated as final. (Tightened from the brief's looser defaults to everyday-regular / true-rotation levels, excluding small-sample players whose rates were offensive cheat codes; see data-model flagged items.)
- The opponent in v1 is an era-average league team; the second-roster (PvP) path is a deferred P2 composition over the same pure sim.
- Blind/IQ mode, daily leaderboard, streak tracking, and a "best possible team today" reveal are out of scope for v1 (P1+).
