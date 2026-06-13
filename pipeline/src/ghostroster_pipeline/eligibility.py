"""Team-decade eligibility (T014).

Maps each player-season to a (franchise, decade) cell and keeps only seasons that
clear the eligibility floor. Defaults per brief §3 (flagged tuning items): hitters
≥ 20 G, SP ≥ 10 GS, RP ≥ 20 relief appearances. A pitcher is classed SP if any
season qualifies as a starter, else RP (swingmen draft as starters).
"""

from __future__ import annotations

import pandas as pd

from .tables import Tables

MIN_HITTER_G = 20
MIN_SP_GS = 10
MIN_RP_RELIEF = 20


def _num(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    out = df.copy()
    for c in cols:
        if c in out.columns:
            out[c] = pd.to_numeric(out[c], errors="coerce").fillna(0)
    return out


def _decade(year: pd.Series) -> pd.Series:
    return (pd.to_numeric(year, errors="coerce") // 10 * 10).astype("Int64")


def team_franchise_map(tables: Tables) -> pd.DataFrame:
    """(yearID, teamID) -> (franchID, franchName). Display name prefers
    TeamsFranchises.franchName, else the team's name that season."""
    teams = tables.teams[["yearID", "teamID", "franchID", "name"]].copy()
    teams["yearID"] = pd.to_numeric(teams["yearID"], errors="coerce").astype("int64")
    if not tables.franchises.empty:
        fr = tables.franchises[["franchID", "franchName"]].drop_duplicates("franchID")
        teams = teams.merge(fr, on="franchID", how="left")
        teams["franchName"] = teams["franchName"].fillna(teams["name"])
    else:
        teams["franchName"] = teams["name"]
    return teams[["yearID", "teamID", "franchID", "franchName"]].drop_duplicates()


def eligible_hitter_seasons(tables: Tables) -> pd.DataFrame:
    """Batting seasons with ≥ MIN_HITTER_G, tagged with franchID/franchName/decade."""
    bat = _num(tables.batting, ["yearID", "G", "AB", "H", "2B", "3B", "HR", "BB",
                                "HBP", "SF", "SH", "SO"])
    fmap = team_franchise_map(tables)
    bat = bat.merge(fmap, on=["yearID", "teamID"], how="inner")
    bat["decade"] = _decade(bat["yearID"])
    return bat[bat["G"] >= MIN_HITTER_G].reset_index(drop=True)


def eligible_pitcher_seasons(tables: Tables) -> pd.DataFrame:
    """Pitching seasons that qualify as SP (GS ≥ MIN_SP_GS) or RP (G-GS ≥
    MIN_RP_RELIEF), with a per-season 'role' column; tagged with franch/decade."""
    pit = _num(tables.pitching, ["yearID", "W", "L", "G", "GS", "IPouts", "H", "ER",
                                 "HR", "BB", "SO", "BFP", "HBP"])
    fmap = team_franchise_map(tables)
    pit = pit.merge(fmap, on=["yearID", "teamID"], how="inner")
    pit["decade"] = _decade(pit["yearID"])
    pit["relief"] = (pit["G"] - pit["GS"]).clip(lower=0)
    is_sp = pit["GS"] >= MIN_SP_GS
    is_rp = pit["relief"] >= MIN_RP_RELIEF
    pit = pit[is_sp | is_rp].copy()
    # Swingmen (qualify both) class as SP.
    pit["role"] = pd.Series(["RP"] * len(pit), index=pit.index)
    pit.loc[pit["GS"] >= MIN_SP_GS, "role"] = "SP"
    return pit.reset_index(drop=True)
