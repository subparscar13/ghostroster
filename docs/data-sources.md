# Data sources & licensing

The game needs: player-season stats by franchise and decade, era context for normalization, and (optionally) play-by-play granularity for a real sim. Licensing posture matters — this is a public consumer product.

## Recommended core: Lahman Database

- **What:** The standard open historical baseball database. Season-level batting, pitching, fielding, teams, appearances, awards — from 1871 through the most recent completed season. Maintained under SABR.
- **License:** Creative Commons Attribution-ShareAlike. Free for this use with attribution.
- **Fit:** Covers everything a rating-based or Pythagorean-based sim needs: per-season counting stats + league/season totals for era adjustment. CSV/SQLite distributions; trivially loaded into Postgres or shipped as static JSON.
- **Gaps:** No play-by-play.
- **Negro Leagues (verified 2026-06-12):** the Oct 30, 2025 Lahman edition added Seamheads-licensed Negro Leagues data — major-league-caliber leagues/teams from the late 19th century through the 1948 NAL/NNL seasons, per SABR task force recommendations ([SABR announcement](https://sabr.org/latest/negro-leagues-statistics-added-to-sabr-lahman-baseball-database/)). No separate Seamheads license needed. **Per D-007, not used in v1**; cheap to add later.
- **Verify at build time:** latest edition year, exact license version.

## If we want a real game sim: Retrosheet

- **What:** Play-by-play event files for most of MLB history (comprehensive from ~1910s onward, varying completeness earlier).
- **License:** Free; requires the standard Retrosheet attribution notice verbatim.
- **Fit:** Needed only if simulating at the plate-appearance level with empirical event distributions. A Markov-chain sim can actually be parameterized from Lahman season rates alone (PA outcome probabilities per player), so Retrosheet is **optional** — useful for validating the sim against real run distributions, or for flavor (real event text).

## Supporting

- **Chadwick Bureau register** — open person-ID crosswalk (Lahman ↔ Retrosheet ↔ MLBAM IDs). Needed if mixing sources.
- **pybaseball (Python lib)** — convenient ETL wrapper for Lahman/Statcast/BRef during the data-pipeline build. Pipeline-side only; don't ship anything BRef-scraped.
- **Statcast** — 2015+ only; irrelevant for an all-eras game except cosmetic flair.

## Avoid as plan-of-record

- **Baseball-Reference scraping.** Two competitors cite "stats via baseball-reference.com." BRef's terms prohibit systematic scraping for products; Sports Reference has sent takedowns before. Not worth it when Lahman is free and equivalent for season stats.
- **MLB Stats API.** Technically accessible, but MLB's terms restrict commercial/product use, and the league actively protects its IP. Also mostly modern-era.
- **Player photos / team logos.** MLB and MLBPA actively enforce. Use team names + decades as text, original iconography, or licensed/PD imagery only. (The clones all appear text-only — for this reason.)

## Era adjustment approaches (design input, decide in D-003)

1. **League-relative rates** (the OPS+/ERA+ idea): player stat ÷ league average for that season, park-blind. Simple, explainable, computable from Lahman alone.
2. **Z-scores within season**: position player's stat vs. league distribution that year. Handles spread changes (e.g., 1968 pitching) better than ratios.
3. **Raw with era multipliers** (what 82-0 seems to do): crude; produces the Wilt-style cheat codes — which, note, generated half the viral conversation. Brokenness can be a feature.

## Pre-build checklist

- [ ] Download current Lahman edition; confirm license text + latest season included
- [x] Decide Negro Leagues scope — D-007: excluded from v1 (data now in Lahman; parking lot)
- [ ] Draft attribution footer text (Lahman/SABR + Retrosheet notice if used)
- [ ] Spike: can the full team-decade → eligible-players index ship as static JSON (<10–20 MB) with no backend? (162-0.net proves yes for hitters-only)
