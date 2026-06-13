"""M1 license gate (T012): the build must verify CC BY-SA text and refuse to
proceed without it. Also covers checksum pinning + attribution emission.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from ghostroster_pipeline.download import (
    EditionError,
    LicenseError,
    resolve_edition,
    write_attribution,
)


def test_resolves_and_verifies_ccbysa(mini_lahman: Path, tmp_path: Path) -> None:
    info = resolve_edition(mini_lahman, tmp_path / "edition.lock.json")
    assert "Attribution-ShareAlike" in info.license_name
    assert info.through_year == 1921
    assert info.edition == "lahman-1921"
    assert len(info.sha256) == 64


def test_pin_then_verify_is_stable(mini_lahman: Path, tmp_path: Path) -> None:
    lock = tmp_path / "edition.lock.json"
    pinned = resolve_edition(mini_lahman, lock, pin=True)
    assert lock.exists()
    # A second resolve must verify cleanly against the just-written lock.
    again = resolve_edition(mini_lahman, lock)
    assert again.sha256 == pinned.sha256


def test_checksum_mismatch_raises(mini_lahman: Path, tmp_path: Path) -> None:
    lock = tmp_path / "edition.lock.json"
    lock.write_text(json.dumps({"sha256": "deadbeef"}), encoding="utf-8")
    with pytest.raises(EditionError, match="checksum"):
        resolve_edition(mini_lahman, lock)


def test_missing_license_text_raises(mini_lahman: Path, tmp_path: Path) -> None:
    # Remove every readme/txt so no license text remains.
    for txt in mini_lahman.rglob("*.txt"):
        txt.unlink()
    with pytest.raises(LicenseError):
        resolve_edition(mini_lahman, tmp_path / "edition.lock.json")


def test_missing_cache_raises(tmp_path: Path) -> None:
    with pytest.raises(EditionError, match="cache not found"):
        resolve_edition(tmp_path / "nope", tmp_path / "edition.lock.json")


def test_attribution_json_written(mini_lahman: Path, tmp_path: Path) -> None:
    info = resolve_edition(mini_lahman, tmp_path / "edition.lock.json")
    out = write_attribution(tmp_path / "data", info)
    payload = json.loads(out.read_text(encoding="utf-8"))
    assert payload["license"] == info.license_name
    assert "MLB" in payload["disclaimer"]
