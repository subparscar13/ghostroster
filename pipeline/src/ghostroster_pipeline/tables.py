"""Typed access to the Lahman CSV tables the pipeline consumes.

A thin loader so the transform modules depend on DataFrames, not on disk. Tests
construct ``Tables`` directly from in-memory frames (synthetic fixtures), so the
whole pipeline is exercisable before the real edition is downloaded.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from .download import locate_lahman, people_file

# Columns we rely on, with the subset actually used downstream. We read only what
# exists to tolerate minor schema drift between editions.
_BATTING = ["playerID", "yearID", "teamID", "lgID", "G", "AB", "R", "H", "2B", "3B",
            "HR", "RBI", "SB", "BB", "SO", "IBB", "HBP", "SF", "SH"]
_PITCHING = ["playerID", "yearID", "teamID", "lgID", "W", "L", "G", "GS", "IPouts",
             "H", "ER", "HR", "BB", "SO", "BFP", "HBP", "ERA"]
_TEAMS = ["yearID", "lgID", "teamID", "franchID", "name", "G", "R", "AB", "H", "2B",
          "3B", "HR", "BB", "SO", "HBP", "SF", "HA", "HRA", "BBA", "SOA", "IPouts"]
_APPEARANCES = ["playerID", "yearID", "teamID", "G_all", "GS", "G_c", "G_1b", "G_2b",
                "G_3b", "G_ss", "G_lf", "G_cf", "G_rf", "G_of", "G_dh", "G_p"]
_PEOPLE = ["playerID", "nameFirst", "nameLast", "nameGiven"]
_FRANCHISES = ["franchID", "franchName", "active"]


def _read(path: Path, wanted: list[str]) -> pd.DataFrame:
    df = pd.read_csv(path, dtype=str, keep_default_na=False, na_values=[""])
    keep = [c for c in wanted if c in df.columns]
    return df[keep].copy()


@dataclass
class Tables:
    batting: pd.DataFrame
    pitching: pd.DataFrame
    teams: pd.DataFrame
    appearances: pd.DataFrame
    people: pd.DataFrame
    franchises: pd.DataFrame  # may be empty if TeamsFranchises.csv absent

    @classmethod
    def from_cache(cls, cache_dir: Path) -> Tables:
        d = locate_lahman(Path(cache_dir))
        franchises_path = d / "TeamsFranchises.csv"
        franchises = (
            _read(franchises_path, _FRANCHISES)
            if franchises_path.exists()
            else pd.DataFrame(columns=_FRANCHISES)
        )
        return cls(
            batting=_read(d / "Batting.csv", _BATTING),
            pitching=_read(d / "Pitching.csv", _PITCHING),
            teams=_read(d / "Teams.csv", _TEAMS),
            appearances=_read(d / "Appearances.csv", _APPEARANCES),
            people=_read(people_file(d), _PEOPLE),
            franchises=franchises,
        )
