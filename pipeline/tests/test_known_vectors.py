"""Acceptance check 4 (T020): a known player's era-adjusted vector matches a
hand-computed value. The fixture's Babe Ruth 1921 stands in here; the real
edition adds 5 real-player spot-checks (committed fixtures) at M1 exit.

Hand computation (z-score projection onto NEUTRAL, D-011, SCALE=0.33), over the
1921 AL fixture's 9 eligible regulars:
  Ruth raw per-PA (PA=689): bb .216255 b1 .123367 b2 .063861 b3 .023222 hr .085631
  pop mean:  bb .095599 b1 .193467 b2 .040479 b3 .012847 hr .020004
  pop std:   bb .046539 b1 .029520 b2 .012228 b3 .006834 hr .025869
  z=(raw-mean)/std -> bb +2.593 b1 -2.375 b2 +1.912 b3 +1.518 hr +2.537
  adj_o = NEUTRAL_o * (1 + 0.33*z) -> bb .1577 b1 .0335 b2 .0734 b3 .0075 hr .0551
  out = 1 - sum = .6727
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from ghostroster_pipeline.run import run_pipeline

EXPECTED_RUTH = {
    "bb": 0.157722, "b1": 0.033536, "b2": 0.073395, "b3": 0.007505, "hr": 0.055115, "out": 0.672727,
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


def test_prestige_flags(mini_lahman: Path, tmp_path: Path) -> None:
    """All-Star is season-specific; HOF is career-level (inducted Players only)."""
    out = tmp_path / "data"
    run_pipeline(mini_lahman, out, tmp_path / "edition.lock.json")
    chunk = json.loads((out / "td" / "NYY-1920.json").read_text())
    by_id = {h["playerId"]: h for h in chunk["hitters"]}
    assert by_id["ruthba01"]["allStar"] is True  # 1921 All-Star in the fixture
    assert by_id["ruthba01"]["hof"] is True  # inducted Player
    assert by_id["meusebo01"]["allStar"] is False  # no All-Star row
    assert by_id["meusebo01"]["hof"] is False  # ballot appearance, not inducted
