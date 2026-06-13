"""Acceptance check 4 (T020): a known player's era-adjusted vector matches a
hand-computed value. The fixture's Babe Ruth 1921 stands in here; the real
edition adds 5 real-player spot-checks (committed fixtures) at M1 exit.

Hand computation (league-relative projection onto NEUTRAL), 1921 AL fixture:
  Ruth raw per-PA (PA=689): bb .216255 b1 .123367 b2 .063860 b3 .023222 hr .085631
  League AL 1921 (PA=11526): bb .089884 b1 .187055 b2 .046504 b3 .014316 hr .013101
  adj_o = NEUTRAL_o * raw_o/league_o  ->  bb .2045 b1 .1022 b2 .0618 b3 .0081 hr .1961
  out = 1 - sum = .4273
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from ghostroster_pipeline.run import run_pipeline

EXPECTED_RUTH = {
    "bb": 0.2045, "b1": 0.1022, "b2": 0.0618, "b3": 0.0081, "hr": 0.1961, "out": 0.4273,
}


def test_ruth_vector_matches_hand_computation(mini_lahman: Path, tmp_path: Path) -> None:
    out = tmp_path / "data"
    run_pipeline(mini_lahman, out, tmp_path / "edition.lock.json")
    chunk = json.loads((out / "td" / "NYY-1920.json").read_text())
    ruth = next(h for h in chunk["hitters"] if h["playerId"] == "ruthba01")
    vec = ruth["vector"]

    assert sum(vec.values()) == pytest.approx(1.0, abs=1e-6)
    for outcome, expected in EXPECTED_RUTH.items():
        assert vec[outcome] == pytest.approx(expected, abs=1e-3), f"{outcome}: {vec[outcome]}"


def test_vector_is_valid_distribution(mini_lahman: Path, tmp_path: Path) -> None:
    out = tmp_path / "data"
    run_pipeline(mini_lahman, out, tmp_path / "edition.lock.json")
    chunk = json.loads((out / "td" / "NYY-1920.json").read_text())
    for player in chunk["hitters"]:
        vec = player["vector"]
        assert all(v >= 0 for v in vec.values())
        assert sum(vec.values()) == pytest.approx(1.0, abs=1e-6)
    for pitcher in chunk["pitchers"]:
        allowed = pitcher["allowed"]
        assert all(v >= 0 for v in allowed.values())
        assert sum(allowed.values()) == pytest.approx(1.0, abs=1e-6)
        assert 0.0 <= pitcher["stamina"] <= 1.0
