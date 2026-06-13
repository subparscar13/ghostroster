"""Best-single-season selection (T015).

Peaks are more fun (game-design-notes): for each (franchise, decade, player) we
keep the single best qualifying season — hitters by OPS, pitchers by ERA (lower is
better). The selection metric is a documented, flaggable choice. Output rows carry
the raw line used for both the display block and the sim vectors.
"""

from __future__ import annotations

import pandas as pd


def _pa(df: pd.DataFrame) -> pd.Series:
    return df["AB"] + df["BB"] + df["HBP"] + df.get("SF", 0) + df.get("SH", 0)


def best_hitter_seasons(hitters: pd.DataFrame) -> pd.DataFrame:
    """One row per (franchID, decade, playerID): the max-OPS qualifying season."""
    df = hitters.copy()
    df["1B"] = (df["H"] - df["2B"] - df["3B"] - df["HR"]).clip(lower=0)
    df["PA"] = _pa(df)
    tb = df["1B"] + 2 * df["2B"] + 3 * df["3B"] + 4 * df["HR"]
    ab_safe = df["AB"].replace(0, pd.NA)
    obp_den = (df["AB"] + df["BB"] + df["HBP"] + df.get("SF", 0)).replace(0, pd.NA)
    df["SLG"] = (tb / ab_safe).fillna(0.0)
    df["OBP"] = ((df["H"] + df["BB"] + df["HBP"]) / obp_den).fillna(0.0)
    df["OPS"] = df["OBP"] + df["SLG"]
    df["AVG"] = (df["H"] / ab_safe).fillna(0.0)
    # Deterministic pick: max OPS, tiebreak more PA, then earliest year, then playerID.
    df = df.sort_values(
        ["franchID", "decade", "playerID", "OPS", "PA", "yearID"],
        ascending=[True, True, True, False, False, True],
    )
    return df.drop_duplicates(["franchID", "decade", "playerID"], keep="first").reset_index(drop=True)


def best_pitcher_seasons(pitchers: pd.DataFrame) -> pd.DataFrame:
    """One row per (franchID, decade, playerID): single role + best (lowest-ERA)
    qualifying season. If a player has any SP-qualifying season in the cell, they
    are an SP (best SP season); otherwise RP."""
    df = pitchers.copy()
    df["IP"] = df["IPouts"] / 3.0
    df["ERA"] = pd.to_numeric(df.get("ERA", 0), errors="coerce")
    # ERA may be blank/inf for odd lines; fall back to ER/IP*9.
    ip_safe = df["IP"].replace(0, pd.NA)
    df["ERA"] = df["ERA"].fillna((df["ER"] / ip_safe * 9).fillna(99.0))

    # Collapse to one role per (cell, player): SP wins if present.
    has_sp = (
        df[df["role"] == "SP"][["franchID", "decade", "playerID"]]
        .drop_duplicates()
        .assign(_sp=True)
    )
    df = df.merge(has_sp, on=["franchID", "decade", "playerID"], how="left")
    df["_sp"] = df["_sp"].fillna(False).astype(bool)
    df = df[((df["_sp"]) & (df["role"] == "SP")) | (~df["_sp"])].copy()
    df["role"] = df["_sp"].map({True: "SP", False: "RP"})

    df = df.sort_values(
        ["franchID", "decade", "playerID", "ERA", "IPouts", "yearID"],
        ascending=[True, True, True, True, False, True],
    )
    return (
        df.drop_duplicates(["franchID", "decade", "playerID"], keep="first")
        .drop(columns=["_sp"])
        .reset_index(drop=True)
    )
