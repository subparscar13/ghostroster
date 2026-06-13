# ghostroster-pipeline

Offline pipeline: **Lahman Database → Ghost Roster static JSON**. Python (uv +
pandas). Deterministic, license-gated, and **never** scrapes Baseball-Reference or
the MLB API (constitution III). Contract: [`../specs/001-ghost-roster-v1/data-model.md`](../specs/001-ghost-roster-v1/data-model.md).

## One-time: get the Lahman data (manual, by design)

The canonical scriptable mirror (`chadwickbureau/baseballdatabank`) went private,
and the current edition ships via SABR's box.com links — which can't be reliably
scripted. So acquisition is a one-time manual download:

1. Open <https://sabr.org/lahman-database/> and download the **Comma-delimited
   (CSV) version** (current direct link:
   <https://sabr.box.com/s/y1prhc795jk8zvmelfd3jq7tl389y6cd>).
2. Extract it into `pipeline/.cache/` (gitignored). The pipeline finds the core
   CSVs recursively, so any nesting is fine — e.g.
   `pipeline/.cache/lahman_1871-2025_csv/core/Batting.csv`. It needs
   `Batting.csv, Pitching.csv, Fielding.csv, Appearances.csv, Teams.csv`, one of
   `People.csv`/`Master.csv`, and a readme containing the CC BY-SA license text.
3. **Pin the edition** (records SHA-256 + license excerpt to `edition.lock.json`,
   which IS committed):

   ```sh
   uv run ghostroster-pipeline --pin
   ```

After pinning, normal runs verify the cache against the lock and fail on any
mismatch — guaranteeing byte-identical output for a fixed edition (constitution V).

## Run

```sh
uv run ghostroster-pipeline          # download-verify → eligibility → vectors → emit
uv run pytest -q                     # acceptance checks + determinism + license gate
```

Output is written to `../public/data/` (`teams.json`, `td/*.json`,
`ATTRIBUTION.json`) and **committed** — the static site needs no pipeline run.

## Eligibility defaults (flagged tuning items)

Hitters ≥ 80 G **and** ≥ 200 PA · SP ≥ 20 GS · RP ≥ 30 relief appearances; a
team-decade cell needs ≥ 9 hitters, ≥ 3 SP, ≥ 1 RP or it is excluded from
`teams.json`. Tightened from the brief's looser defaults to everyday-regular /
true-rotation thresholds — still flagged tuning levers.
