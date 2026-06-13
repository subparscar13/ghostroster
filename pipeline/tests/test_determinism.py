"""Determinism (constitution V): same edition in → byte-identical JSON out."""

from __future__ import annotations

from pathlib import Path

from ghostroster_pipeline.run import run_pipeline


def test_two_runs_are_byte_identical(mini_lahman: Path, tmp_path: Path) -> None:
    a, b = tmp_path / "a", tmp_path / "b"
    run_pipeline(mini_lahman, a, tmp_path / "lock.json")
    run_pipeline(mini_lahman, b, tmp_path / "lock.json")

    files_a = sorted(p.relative_to(a).as_posix() for p in a.rglob("*") if p.is_file())
    files_b = sorted(p.relative_to(b).as_posix() for p in b.rglob("*") if p.is_file())
    assert files_a == files_b
    for rel in files_a:
        assert (a / rel).read_bytes() == (b / rel).read_bytes(), f"{rel} differs between runs"
