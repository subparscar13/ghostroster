"""Era-adjusted per-PA outcome vectors (T016; z-score projection, D-011).

A player's six per-PA outcome rates (bb/b1/b2/b3/hr, with `out` as the residual)
are graded against the *distribution of their own era's regulars* and projected
onto a fixed neutral baseline. For each outcome we compute how many standard
deviations the player sits above (or below) the mean of the eligible-player
population in their league-season — a z-score — and bump the neutral baseline by
`SCALE × z`:

    adjusted_o = NEUTRAL_o × (1 + SCALE × z_o),   z_o = (raw_o − mean_o) / std_o

This replaces the earlier raw league-*ratio* projection (`adjusted = NEUTRAL ×
raw/league`). The ratio exploded in low-offense eras — when a league rate is tiny,
an ordinary edge becomes a huge multiple — which over-amplified dead-ball seasons
and made the optimal-roster ceiling trivially perfect (see docs/decision-log D-011,
D-003). Measuring deviation against the era's actual spread of players fixes both:
the rankings stop favoring dead-ball outliers, and `SCALE` is a single, principled
difficulty knob calibrated to the optimal-roster 162-0 target.

HBP folds into BB. Pitcher 2B/3B-allowed are split from league hit-type
proportions (Lahman lacks per-pitcher 2B/3B allowed) — a flagged tuning item.
The mean+std population is the same eligibility gate the shipped pool uses
(eligibility.py), so the distribution describes real regulars, not all comers.
"""

from __future__ import annotations

import os

import pandas as pd

from . import eligibility

# Neutral baseline run environment (per-PA), summing to 1.0. A fixed, documented,
# flaggable reference point onto which era-relative z-scores are projected. An
# exactly-average regular (z = 0 across the board) plays to this baseline.
NEUTRAL: dict[str, float] = {
    "bb": 0.085, "b1": 0.155, "b2": 0.045, "b3": 0.005, "hr": 0.030, "out": 0.680,
}
OUTCOMES = ("bb", "b1", "b2", "b3", "hr")

# Difficulty knob (D-011): standard-deviations-to-baseline gain. Calibrated so the
# globally optimal roster reaches 162-0 ~30-45% of the time (a real accomplishment
# even at the ceiling) while a realistic best-pick draft stays roughly as before.
# Changing this re-shapes the win distribution and the player rankings; it is the
# single tuning lever and is pinned here for determinism. The GR_ZSCALE env var
# overrides it for offline calibration sweeps only — production builds leave it
# unset, so the shipped data is a pure function of (edition, this default).
SCALE = float(os.environ.get("GR_ZSCALE", "0.33"))


def _rates_from_totals(ab, h, b2, b3, hr, bb, hbp, sf) -> dict[str, float]:
    pa = ab + bb + hbp + sf
    if pa <= 0:
        return {**{o: 0.0 for o in OUTCOMES}, "out": 1.0}
    b1 = max(h - b2 - b3 - hr, 0)
    r = {"bb": (bb + hbp) / pa, "b1": b1 / pa, "b2": b2 / pa, "b3": b3 / pa, "hr": hr / pa}
    r["out"] = max(1.0 - sum(r[o] for o in OUTCOMES), 0.0)
    return r


def _hit_split(h, b2, b3, hr) -> tuple[float, float, float]:
    """Fraction of non-HR hits that are 1B, 2B, 3B (league context for pitchers)."""
    non_hr = max(h - hr, 0)
    if non_hr <= 0:
        return (1.0, 0.0, 0.0)
    b1 = max(non_hr - b2 - b3, 0)
    return (b1 / non_hr, b2 / non_hr, b3 / non_hr)


def _pitcher_raw_rates(row: pd.Series, split: tuple[float, float, float]) -> dict[str, float]:
    """A pitcher's allowed per-PA rates; b1/b2/b3 split from the league hit mix."""
    bfp = row.get("BFP", 0) or (row["IPouts"] + row["H"] + row["BB"])
    p1, p2, p3 = split
    if bfp <= 0:
        return {**{o: 0.0 for o in OUTCOMES}, "out": 1.0}
    non_hr = max(row["H"] - row["HR"], 0)
    r = {"bb": (row["BB"] + row.get("HBP", 0)) / bfp, "hr": row["HR"] / bfp,
         "b1": non_hr * p1 / bfp, "b2": non_hr * p2 / bfp, "b3": non_hr * p3 / bfp}
    r["out"] = max(1.0 - sum(r[o] for o in OUTCOMES), 0.0)
    return r


def _agg(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    g = df.copy()
    for c in cols:
        g[c] = pd.to_numeric(g.get(c, 0), errors="coerce").fillna(0)
    return g


def league_hitter_rates(tables) -> dict:
    """{(yearID, lgID): rates} and {yearID: rates} (fallback) for batting, plus
    the non-HR hit-type split used for pitcher 2B/3B estimation. (Used now only for
    the pitcher hit-type split; the player-vs-league grading uses the z-score
    distribution below.)"""
    t = _agg(tables.teams, ["yearID", "AB", "H", "2B", "3B", "HR", "BB", "HBP", "SF"])
    out: dict = {}
    for keys in (("yearID", "lgID"), ("yearID",)):
        gb = t.groupby(list(keys), dropna=False).sum(numeric_only=True)
        for idx, row in gb.iterrows():
            rates = _rates_from_totals(row["AB"], row["H"], row["2B"], row["3B"],
                                       row["HR"], row["BB"], row["HBP"], row["SF"])
            rates["split"] = _hit_split(row["H"], row["2B"], row["3B"], row["HR"])
            out[idx if isinstance(idx, tuple) else (idx,)] = rates
    return out


def _dist_from_frame(frame: pd.DataFrame) -> dict:
    """Per-(yearID, lgID) and per-(yearID,) {outcome: (mean, std)} over a frame of
    per-player rate rows (population std, ddof=0)."""
    out: dict = {}
    if frame.empty:
        return out
    for keys in (["yearID", "lgID"], ["yearID"]):
        gb = frame.groupby(keys, dropna=False)
        means = gb[list(OUTCOMES)].mean()
        stds = gb[list(OUTCOMES)].std(ddof=0)
        for idx in means.index:
            key = idx if isinstance(idx, tuple) else (idx,)
            out[key] = {o: (float(means.loc[idx, o]), float(stds.loc[idx, o])) for o in OUTCOMES}
    return out


def league_hitter_dist(tables) -> dict:
    """Mean+std of each outcome rate across eligible hitter-seasons, by league-year.
    The population is exactly the shipped eligibility gate (≥ 80 G & ≥ 200 PA), so
    z-scores grade a player against real everyday regulars of his era."""
    elig = eligibility.eligible_hitter_seasons(tables)
    rows = []
    for _, r in elig.iterrows():
        rates = _rates_from_totals(r["AB"], r["H"], r["2B"], r["3B"], r["HR"],
                                   r["BB"], r["HBP"], r.get("SF", 0))
        rows.append({"yearID": int(r["yearID"]), "lgID": r.get("lgID"),
                     **{o: rates[o] for o in OUTCOMES}})
    return _dist_from_frame(pd.DataFrame(rows))


def league_pitcher_dist(tables) -> dict:
    """Mean+std of each allowed-outcome rate across eligible pitcher-seasons (SP+RP),
    by league-year. b1/b2/b3 use each league-year's hit split, so their spread
    tracks hits-allowed variation among that era's rotation/bullpen regulars."""
    league_hit = league_hitter_rates(tables)
    elig = eligibility.eligible_pitcher_seasons(tables)
    rows = []
    for _, r in elig.iterrows():
        split = _lookup(league_hit, r["yearID"], r.get("lgID")).get("split", (1.0, 0.0, 0.0))
        rates = _pitcher_raw_rates(r, split)
        rows.append({"yearID": int(r["yearID"]), "lgID": r.get("lgID"),
                     **{o: rates[o] for o in OUTCOMES}})
    return _dist_from_frame(pd.DataFrame(rows))


def _lookup(rates: dict, year, lg) -> dict:
    return rates.get((year, lg)) or rates.get((year,)) or NEUTRAL


_NEUTRAL_DIST = {o: (NEUTRAL[o], 0.0) for o in OUTCOMES}


def _lookup_dist(dist: dict, year, lg) -> dict:
    y = int(year)
    return dist.get((y, lg)) or dist.get((y,)) or _NEUTRAL_DIST


def _project_z(raw: dict[str, float], dist: dict) -> dict[str, float]:
    """adjusted_o = NEUTRAL_o * (1 + SCALE * z_o); z from the era distribution.
    Clamp ≥ 0, leave ≥ 1% out-probability, set out = 1 - rest, round to 6 dp."""
    adj = {}
    for o in OUTCOMES:
        mean, std = dist.get(o, _NEUTRAL_DIST[o])
        z = (raw[o] - mean) / std if std > 1e-12 else 0.0
        adj[o] = max(NEUTRAL[o] * (1.0 + SCALE * z), 0.0)
    s = sum(adj.values())
    if s > 0.99:  # leave at least 1% out-probability
        scale = 0.99 / s
        for o in OUTCOMES:
            adj[o] *= scale
    # Round the non-out outcomes first, then let out absorb the residual so the
    # vector sums to exactly 1.0 at 6 dp.
    for o in OUTCOMES:
        adj[o] = round(adj[o], 6)
    adj["out"] = round(max(1.0 - sum(adj[o] for o in OUTCOMES), 0.0), 6)
    return adj


def hitter_vector(row: pd.Series, dist_hit: dict) -> dict[str, float]:
    raw = _rates_from_totals(row["AB"], row["H"], row["2B"], row["3B"], row["HR"],
                             row["BB"], row["HBP"], row.get("SF", 0))
    return _project_z(raw, _lookup_dist(dist_hit, row["yearID"], row.get("lgID")))


def pitcher_allowed_vector(row: pd.Series, dist_pitch: dict, league_hit: dict) -> dict[str, float]:
    split = _lookup(league_hit, row["yearID"], row.get("lgID")).get("split", (1.0, 0.0, 0.0))
    raw = _pitcher_raw_rates(row, split)
    return _project_z(raw, _lookup_dist(dist_pitch, row["yearID"], row.get("lgID")))


def stamina(row: pd.Series) -> float:
    """Display/usage stat in [0,1]: innings-per-appearance tendency, normalized so a
    ~9-IP workhorse ≈ 1.0. Flagged: no fatigue model consumes this in v1."""
    g = row["G"] or 1
    ip_per_app = (row["IPouts"] / 3.0) / g
    return round(min(ip_per_app / 9.0, 1.0), 4)
