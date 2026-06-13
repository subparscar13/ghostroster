"""Acceptance checks 1 & 2 (T018): total public/data payload < 20 MB and every
td chunk < 100 KB. (The fixture is tiny — this validates the gate logic; the real
edition exercises the true limits.)"""

from __future__ import annotations

from pathlib import Path

from ghostroster_pipeline.run import run_pipeline

MAX_TOTAL = 20 * 1024 * 1024
MAX_CHUNK = 100 * 1024


def test_payload_within_budget(mini_lahman: Path, tmp_path: Path) -> None:
    out = tmp_path / "data"
    run_pipeline(mini_lahman, out, tmp_path / "edition.lock.json")

    total = sum(p.stat().st_size for p in out.rglob("*") if p.is_file())
    assert total < MAX_TOTAL, f"total payload {total} exceeds {MAX_TOTAL}"

    chunks = list((out / "td").glob("*.json"))
    assert chunks, "expected at least one td chunk"
    for chunk in chunks:
        assert chunk.stat().st_size < MAX_CHUNK, f"{chunk.name} exceeds {MAX_CHUNK} bytes"
