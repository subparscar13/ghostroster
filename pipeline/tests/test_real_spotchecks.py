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
# Pedro Martinez (SP allowed), Mariano Rivera (RP allowed).
SPOTCHECKS = [
    ("NYY-1920.json", "ruthba01", "hitters", "vector",
     {"bb": 0.256323, "b1": 0.095381, "b2": 0.060598, "b3": 0.005449, "hr": 0.329592, "out": 0.252657}),
    ("BOS-1930.json", "willite01", "hitters", "vector",
     {"bb": 0.139473, "b1": 0.127084, "b2": 0.06588, "b3": 0.007743, "hr": 0.081907, "out": 0.577913}),
    ("PIT-1980.json", "bondsba01", "hitters", "vector",
     {"bb": 0.12024, "b1": 0.144424, "b2": 0.056221, "b3": 0.007095, "hr": 0.066299, "out": 0.605721}),
    ("BOS-1990.json", "martipe02", "pitchers", "allowed",
     {"bb": 0.050837, "b1": 0.133431, "b2": 0.038738, "b3": 0.004304, "hr": 0.01112, "out": 0.76157}),
    ("NYY-1990.json", "riverma01", "pitchers", "allowed",
     {"bb": 0.072309, "b1": 0.11288, "b2": 0.032772, "b3": 0.003641, "hr": 0.007699, "out": 0.770699}),
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
    # Ruth's era-adjusted HR rate dwarfs the 0.03 neutral baseline; elite pitchers suppress HR.
    ruth = _vector("NYY-1920.json", "ruthba01", "hitters", "vector")
    pedro = _vector("BOS-1990.json", "martipe02", "pitchers", "allowed")
    rivera = _vector("NYY-1990.json", "riverma01", "pitchers", "allowed")
    assert ruth["hr"] > 0.20
    assert pedro["hr"] < 0.02
    assert rivera["hr"] < 0.02
