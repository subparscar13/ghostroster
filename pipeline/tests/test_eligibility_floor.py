"""Acceptance check 3 (T019): every cell in teams.json clears the floor
(≥9 hitters, ≥3 SP, ≥1 RP); sub-floor cells are excluded."""

from __future__ import annotations

import json
from pathlib import Path

from ghostroster_pipeline.run import run_pipeline


def _build(cache: Path, tmp: Path) -> Path:
    out = tmp / "data"
    run_pipeline(cache, out, tmp / "edition.lock.json")
    return out


def test_every_emitted_cell_meets_floor(mini_lahman: Path, tmp_path: Path) -> None:
    out = _build(mini_lahman, tmp_path)
    teams = json.loads((out / "teams.json").read_text())
    assert teams["cells"], "expected at least one eligible cell from the fixture"
    for cell in teams["cells"]:
        c = cell["counts"]
        assert c["hitters"] >= 9 and c["sp"] >= 3 and c["rp"] >= 1


def test_qualifying_cell_present_and_subfloor_absent(mini_lahman: Path, tmp_path: Path) -> None:
    out = _build(mini_lahman, tmp_path)
    teams = json.loads((out / "teams.json").read_text())
    ids = {(c["franchiseId"], c["decade"]) for c in teams["cells"]}
    assert ("NYY", 1920) in ids  # NYA 1921 maps to franchise NYY; 9H/3SP/1RP
    assert ("BOS", 1920) not in ids  # fixture BOS has no players → below floor
    # The chunk for the present cell exists and is internally consistent.
    chunk = json.loads((out / "td" / "NYY-1920.json").read_text())
    assert len(chunk["hitters"]) >= 9
    assert sum(p["role"] == "SP" for p in chunk["pitchers"]) >= 3
    assert sum(p["role"] == "RP" for p in chunk["pitchers"]) >= 1
