# Data Model: Ghost Roster v1

The JSON contract between the Python pipeline (M1) and the TypeScript app/sim
(M2–M4). The pipeline is the producer; nothing crosses back at runtime. All files
are emitted deterministically (sorted keys, stable row order, fixed float
rounding, pinned Lahman edition → byte-identical output).

## Outcome vector (shared shape)

Per-plate-appearance probabilities, summing to 1.0. Used for both hitters
(produced outcomes) and pitchers (allowed outcomes). HBP is folded into `BB`.

```jsonc
// OutcomeVector
{ "bb": 0.0, "b1": 0.0, "b2": 0.0, "b3": 0.0, "hr": 0.0, "out": 0.0 }
```

Era adjustment is league-relative: a player's per-PA rate for each outcome is
divided by the league rate for that outcome in that season, then applied to a
neutral baseline environment. (Z-score normalization is the documented fallback
if league-relative ratios distort 1968-style outlier seasons — flagged tuning
item, validated in M2's notebook, not implemented blindly.)

## `public/data/teams.json` — spin index

Lists every (franchise, decade) cell that meets the eligibility floor. Franchise
identity is **text only** — no logos, marks, or IDs that imply licensed assets.

```jsonc
{
  "edition": "lahman-2025",            // pinned source edition
  "generatedFrom": "Lahman Database",
  "cells": [
    {
      "franchiseId": "NYA",            // Lahman franchID (text key only)
      "franchise": "New York Yankees", // display text
      "decade": 1920,                  // decade start year
      "chunk": "td/NYA-1920.json",     // relative path to the pool chunk
      "counts": { "hitters": 14, "sp": 5, "rp": 3 }
    }
    // ... only cells with >= 9 hitters, >= 3 SP, >= 1 RP appear here
  ]
}
```

## `public/data/td/{franchiseId}-{decade}.json` — team-decade pool

One chunk per cell, lazy-loaded on spin, **< 100 KB**. Contains eligible players
with a display block (raw best-season line for the draft UI) and a sim block
(era-adjusted vectors).

```jsonc
{
  "franchiseId": "NYA",
  "franchise": "New York Yankees",
  "decade": 1920,
  "hitters": [
    {
      "playerId": "ruthba01",          // Lahman playerID
      "name": "Babe Ruth",
      "pos": ["RF","LF","1B"],         // eligible fielding slots (DH-loose)
      "display": {                      // raw best-season line for the draft UI
        "year": 1921, "team": "NYA",
        "G": 152, "PA": 693, "AB": 540, "H": 204, "2B": 44, "3B": 16,
        "HR": 59, "BB": 145, "HBP": 4, "SO": 81, "AVG": ".378", "OPS": "1.359"
      },
      "vector": { "bb": 0.0, "b1": 0.0, "b2": 0.0, "b3": 0.0, "hr": 0.0, "out": 0.0 }
    }
  ],
  "pitchers": [
    {
      "playerId": "...",
      "name": "...",
      "role": "SP",                    // "SP" | "RP"
      "display": {
        "year": 1978, "team": "NYA",
        "W": 25, "L": 3, "ERA": "1.74", "G": 35, "GS": 35, "IP": 273.0,
        "H": 184, "BB": 51, "SO": 248, "HR": 13
      },
      "allowed": { "bb": 0.0, "b1": 0.0, "b2": 0.0, "b3": 0.0, "hr": 0.0, "out": 0.0 },
      "stamina": 0.0                    // display + usage stat (innings tendency)
    }
  ]
}
```

**Pitcher vector derivation:** from the Lahman pitching line (BB, H, HR, IP →
batters faced), with 2B/3B-allowed split **estimated from league hit-type splits**
that season (Lahman lacks per-pitcher 2B/3B allowed) — flagged tuning item.

## Sim types (TypeScript, M2)

```ts
// All pure; no I/O, no globals, no Math.random — RNG is mulberry32(seed).
type Hitter   = { playerId: string; name: string; pos: string[]; vector: OutcomeVector };
type Pitcher  = { playerId: string; name: string; role: 'SP'|'RP'; allowed: OutcomeVector; stamina: number };
type Roster   = { lineup: Hitter[9]; rotation: Pitcher[3]; bullpen: Pitcher[1] };
type OpponentModel = { batter: OutcomeVector; pitcher: OutcomeVector }; // era-average league team (v1)

type LineScore   = { runs: number; hits: number; innings: number[] };
type BattingLine = { playerId: string; pa: number; h: number; b2: number; b3: number; hr: number; bb: number; rbi: number; r: number };
type GameLog     = { game: number; home: LineScore; away: LineScore; batting: BattingLine[]; win: boolean };
type Highlights  = { longestWinStreak: number; noHitters: number; bestGame: number; worstGame: number; topPerformer: string };
type SeasonResult = { record: { w: number; l: number }; gameLogs: GameLog[]; highlights: Highlights; grade: string };

function simulateSeason(roster: Roster, opponent: OpponentModel, seed: number): SeasonResult; // pure + deterministic
```

## PA resolution & base-out state machine (M2)

- **Blend:** batter vs. pitcher via log5 / odds-ratio against the league baseline
  (`OpponentModel`), then sample with mulberry32.
- **Base-out:** 24 states (3 base configs × 0/1/2 outs). Advancement table is kept
  **deliberately dumb and documented** — tuned only if run-environment validation
  fails (M2 target SC-004):

  | Event | Runner advancement |
  |---|---|
  | 1B | batter→1B; runners +1 base; runner on 2B scores 50% |
  | 2B | batter→2B; all runners +2 bases |
  | 3B | batter→3B; all runners score |
  | HR | batter + all runners score |
  | BB | batter→1B; force-advance only |
  | OUT | +1 out; no advancement (no double plays / sac flies in v1 — flagged lever) |

- **Pitching usage:** rotation cycles SP1→SP2→SP3 across the 162-game schedule;
  the single RP pitches innings 7–9 every game. **No fatigue model in v1** (flagged
  tuning lever).
- **Innings/extras:** standard 9 innings, standard extra-innings rules.

## Local-storage state (app, M3–M4)

```jsonc
{
  "inProgressRun": { "cell": "NYA-1920", "picks": [], "rerollsUsed": { "team": 0, "era": 0 } },
  "daily": { "2026-06-12": { "record": "158-4", "grade": "A", "squares": "🟩🟩🟥", "playedAt": "..." } }
}
```

## Flagged tuning items (do not silently resolve)

Pitcher eligibility (≥10 GS) + RP usage rule; 2B/3B-allowed league-split estimate;
z-score fallback for outlier seasons; advancement-table refinements + no-DP/no-SF
+ no-RP-fatigue levers; letter-grade scale; run-environment ±10% / 162-0 top-1–3%
/ 145–158 near-miss calibration (SC-004).
