"""Acceptance check 4 (T023): spot-check 5 real players' emitted vectors against
pinned values (regression) + sanity relationships, on the committed real edition
(public/data). Complements test_known_vectors.py, which hand-derives the formula on
the synthetic fixture. Re-pin deliberately if the pipeline intentionally changes.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

DATA = Path(__file__).resolve().parents[2] / "public" / "data"

# (chunk, playerId, kind, expected vector) — Babe Ruth, Ted Williams, Barry Bonds,
# Pedro Martinez (SP allowed), Mariano Rivera (RP allowed). Pinned to the z-score
# projection (D-011, SCALE=0.33): a player is graded by SDs above his era's
# eligible-regular distribution, not by a raw league ratio.
SPOTCHECKS = [
    ("NYY-1920.json", "ruthba01", "hitters", "vector",
     {"bb": 0.210641, "b1": 0.019566, "b2": 0.05886, "b3": 0.005211, "hr": 0.095667, "out": 0.610055}),
    ("BOS-1930.json", "willite01", "hitters", "vector",
     {"bb": 0.12884, "b1": 0.084927, "b2": 0.067828, "b3": 0.006595, "hr": 0.04731, "out": 0.6645}),
    ("PIT-1980.json", "bondsba01", "hitters", "vector",
     {"bb": 0.113126, "b1": 0.122635, "b2": 0.055907, "b3": 0.005774, "hr": 0.045232, "out": 0.657326}),
    ("BOS-1990.json", "martipe02", "pitchers", "allowed",
     {"bb": 0.041061, "b1": 0.109439, "b2": 0.031773, "b3": 0.00353, "hr": 0.012692, "out": 0.801505}),
    ("NYY-1990.json", "riverma01", "pitchers", "allowed",
     {"bb": 0.062722, "b1": 0.062717, "b2": 0.018208, "b3": 0.002023, "hr": 0.009306, "out": 0.845024}),
]

pytestmark = pytest.mark.skipif(not DATA.exists(), reason="public/data not generated (run the pipeline)")


def _vector(chunk: str, player_id: str, pool: str, field: str) -> dict:
    data = json.loads((DATA / "td" / chunk).read_text(encoding="utf-8"))
    player = next(p for p in data[pool] if p["playerId"] == player_id)
    return player[field]


@pytest.mark.parametrize("chunk,player_id,pool,field,expected", SPOTCHECKS)
def test_real_player_vector_pinned(chunk, player_id, pool, field, expected):
    vec = _vector(chunk, player_id, pool, field)
    assert sum(vec.values()) == pytest.approx(1.0, abs=1e-6)
    for outcome, value in expected.items():
        assert vec[outcome] == pytest.approx(value, abs=1e-9), f"{player_id} {outcome} drifted"


def test_spotcheck_sanity_relationships():
    # Ruth's era-adjusted HR rate sits well above the 0.03 neutral baseline but is no
    # longer cartoonish — z-score (D-011) compresses the dead-ball outlier explosion
    # the old league-ratio produced (~0.33). Elite pitchers still suppress HR hard.
    ruth = _vector("NYY-1920.json", "ruthba01", "hitters", "vector")
    pedro = _vector("BOS-1990.json", "martipe02", "pitchers", "allowed")
    rivera = _vector("NYY-1990.json", "riverma01", "pitchers", "allowed")
    assert 0.06 < ruth["hr"] < 0.20  # elite, not cartoonish
    assert pedro["hr"] < 0.02
    assert rivera["hr"] < 0.02
