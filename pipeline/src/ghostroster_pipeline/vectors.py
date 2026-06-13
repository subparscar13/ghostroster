"""Era-adjusted, league-relative per-PA outcome vectors (T016).

Per brief §3/§4: a player's per-PA rate for each outcome is divided by the league
rate that season (by league+year) and applied to a neutral baseline environment —
the OPS+/ERA+ idea, per outcome. HBP folds into BB. Pitcher 2B/3B-allowed are
split from league hit-type proportions (Lahman lacks per-pitcher 2B/3B allowed) —
a flagged tuning item. The z-score alternative is the documented fallback if M2
tuning shows league ratios distort outlier seasons; it is not built here.
"""

from __future__ import annotations

import pandas as pd

# Neutral baseline run environment (per-PA), summing to 1.0. A fixed, documented,
# flaggable reference point onto which league-relative ratios are projected.
NEUTRAL: dict[str, float] = {
    "bb": 0.085, "b1": 0.155, "b2": 0.045, "b3": 0.005, "hr": 0.030, "out": 0.680,
}
OUTCOMES = ("bb", "b1", "b2", "b3", "hr")


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


def _agg(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    g = df.copy()
    for c in cols:
        g[c] = pd.to_numeric(g.get(c, 0), errors="coerce").fillna(0)
    return g


def league_hitter_rates(tables) -> dict:
    """{(yearID, lgID): rates} and {yearID: rates} (fallback) for batting, plus
    the non-HR hit-type split used for pitcher 2B/3B estimation."""
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


def league_pitcher_rates(tables) -> dict:
    """{(yearID, lgID): allowed-rates} and {(yearID,): ...} from team pitching
    (HA/HRA/BBA/IPouts), with 2B/3B split borrowed from league batting."""
    t = _agg(tables.teams, ["yearID", "HA", "HRA", "BBA", "IPouts"])
    hit = league_hitter_rates(tables)
    out: dict = {}
    for keys in (("yearID", "lgID"), ("yearID",)):
        gb = t.groupby(list(keys), dropna=False).sum(numeric_only=True)
        for idx, row in gb.iterrows():
            key = idx if isinstance(idx, tuple) else (idx,)
            bfp = row["IPouts"] + row["HA"] + row["BBA"]
            p1, p2, p3 = hit.get(key, {}).get("split", (1.0, 0.0, 0.0))
            if bfp <= 0:
                out[key] = {**{o: 0.0 for o in OUTCOMES}, "out": 1.0}
                continue
            non_hr = max(row["HA"] - row["HRA"], 0)
            r = {"bb": row["BBA"] / bfp, "hr": row["HRA"] / bfp,
                 "b1": non_hr * p1 / bfp, "b2": non_hr * p2 / bfp, "b3": non_hr * p3 / bfp}
            r["out"] = max(1.0 - sum(r[o] for o in OUTCOMES), 0.0)
            out[key] = r
    return out


def _lookup(rates: dict, year, lg) -> dict:
    return rates.get((year, lg)) or rates.get((year,)) or NEUTRAL


def _project(raw: dict[str, float], league: dict[str, float]) -> dict[str, float]:
    """adjusted_o = NEUTRAL_o * (raw_o / league_o), then clamp + set out = 1 - rest."""
    adj = {}
    for o in OUTCOMES:
        lr = league.get(o, 0.0)
        ratio = (raw[o] / lr) if lr > 0 else 1.0
        adj[o] = max(NEUTRAL[o] * ratio, 0.0)
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


def hitter_vector(row: pd.Series, league: dict) -> dict[str, float]:
    raw = _rates_from_totals(row["AB"], row["H"], row["2B"], row["3B"], row["HR"],
                             row["BB"], row["HBP"], row.get("SF", 0))
    return _project(raw, _lookup(league, row["yearID"], row.get("lgID")))


def pitcher_allowed_vector(row: pd.Series, league_pitch: dict, league_hit: dict) -> dict[str, float]:
    bfp = row.get("BFP", 0) or (row["IPouts"] + row["H"] + row["BB"])
    p1, p2, p3 = _lookup(league_hit, row["yearID"], row.get("lgID")).get("split", (1.0, 0.0, 0.0))
    if bfp <= 0:
        raw = {**{o: 0.0 for o in OUTCOMES}, "out": 1.0}
    else:
        non_hr = max(row["H"] - row["HR"], 0)
        raw = {"bb": (row["BB"] + row.get("HBP", 0)) / bfp, "hr": row["HR"] / bfp,
               "b1": non_hr * p1 / bfp, "b2": non_hr * p2 / bfp, "b3": non_hr * p3 / bfp}
        raw["out"] = max(1.0 - sum(raw[o] for o in OUTCOMES), 0.0)
    return _project(raw, _lookup(league_pitch, row["yearID"], row.get("lgID")))


def stamina(row: pd.Series) -> float:
    """Display/usage stat in [0,1]: innings-per-appearance tendency, normalized so a
    ~9-IP workhorse ≈ 1.0. Flagged: no fatigue model consumes this in v1."""
    g = row["G"] or 1
    ip_per_app = (row["IPouts"] / 3.0) / g
    return round(min(ip_per_app / 9.0, 1.0), 4)
