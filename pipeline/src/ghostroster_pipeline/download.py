"""Locate the pinned Lahman edition in the local cache, verify its checksum and
CC BY-SA license text, and capture attribution metadata.

Per D-005 + constitution III: the data source is the Lahman Database (current
edition, CC BY-SA). The canonical scriptable mirror (chadwickbureau GitHub) went
private, and the current edition ships via SABR's box.com links, so acquisition is
a one-time manual download into ``pipeline/.cache/`` (documented in README). This
module never scrapes Baseball-Reference or the MLB API — it only reads files the
operator placed in the cache.

The edition is *pinned*: ``edition.lock.json`` records the SHA-256 of the core CSV
set and a license excerpt. ``--pin`` writes that lock the first time; every normal
run verifies against it, giving byte-stable inputs (constitution V).
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path

# Core Lahman CSVs the pipeline consumes. People.csv is the modern name for the
# old Master.csv; either is accepted by locate().
CORE_FILES = ("Batting.csv", "Pitching.csv", "Fielding.csv", "Appearances.csv", "Teams.csv")
PEOPLE_FILES = ("People.csv", "Master.csv")

# CC BY-SA is required. Match the license phrase the Lahman readme uses, any version.
_LICENSE_RE = re.compile(
    r"Creative Commons Attribution[- ]ShareAlike(?:\s+(\d+\.\d+))?", re.IGNORECASE
)


class LicenseError(RuntimeError):
    """Raised when the cached edition lacks verifiable CC BY-SA license text."""


class EditionError(RuntimeError):
    """Raised when the cache is missing, malformed, or fails checksum verification."""


@dataclass(frozen=True)
class EditionInfo:
    """Resolved, verified edition metadata captured for attribution + pinning."""

    edition: str  # e.g. "lahman-2025"
    through_year: int  # latest yearID present in Batting.csv
    sha256: str  # digest over the core CSV set
    license_name: str  # e.g. "Creative Commons Attribution-ShareAlike 3.0"
    license_excerpt: str  # the matched line(s) from the readme, verbatim


def locate_lahman(cache_dir: Path) -> Path:
    """Return the directory in the cache that contains the core Lahman CSVs.

    Searches recursively so it works whether the operator extracted the zip flat
    or kept the ``lahman_1871-2025_csv/core/`` nesting.
    """
    cache_dir = Path(cache_dir)
    if not cache_dir.exists():
        raise EditionError(
            f"Lahman cache not found at {cache_dir}. Download the current edition's CSV "
            f"distribution from SABR (https://sabr.org/lahman-database/) and extract it here. "
            f"See pipeline/README.md."
        )
    for batting in sorted(cache_dir.rglob("Batting.csv")):
        d = batting.parent
        if all((d / f).exists() for f in CORE_FILES) and any((d / p).exists() for p in PEOPLE_FILES):
            return d
    raise EditionError(
        f"No complete Lahman core CSV set found under {cache_dir}. Expected "
        f"{', '.join(CORE_FILES)} and one of {PEOPLE_FILES} in one directory."
    )


def people_file(lahman_dir: Path) -> Path:
    for name in PEOPLE_FILES:
        p = lahman_dir / name
        if p.exists():
            return p
    raise EditionError(f"Neither People.csv nor Master.csv found in {lahman_dir}.")


def _digest(lahman_dir: Path) -> str:
    """Deterministic SHA-256 over the core CSV set (sorted name + bytes)."""
    h = hashlib.sha256()
    names = sorted([*CORE_FILES, people_file(lahman_dir).name])
    for name in names:
        h.update(name.encode("utf-8"))
        h.update(b"\0")
        h.update((lahman_dir / name).read_bytes())
        h.update(b"\0")
    return h.hexdigest()


def _through_year(lahman_dir: Path) -> int:
    """Latest yearID in Batting.csv, read cheaply without loading the whole frame."""
    years: set[int] = set()
    with (lahman_dir / "Batting.csv").open("r", encoding="utf-8", errors="replace") as fh:
        header = fh.readline().rstrip("\n").split(",")
        try:
            yi = header.index("yearID")
        except ValueError as exc:  # pragma: no cover - malformed input
            raise EditionError("Batting.csv has no yearID column.") from exc
        for line in fh:
            parts = line.split(",")
            if len(parts) > yi and parts[yi].isdigit():
                years.add(int(parts[yi]))
    if not years:
        raise EditionError("Batting.csv contained no parseable yearID values.")
    return max(years)


def verify_license(lahman_dir: Path) -> tuple[str, str]:
    """Scan readme/license files for CC BY-SA text. Returns (license_name, excerpt).

    Raises LicenseError if no Creative Commons Attribution-ShareAlike text is found —
    the build must fail rather than ship unlicensed data (constitution III).
    """
    candidates: list[Path] = []
    for pattern in ("readme*.txt", "README*", "LICENSE*", "license*.txt", "*.txt"):
        candidates.extend(sorted(lahman_dir.glob(pattern)))
        candidates.extend(sorted(lahman_dir.parent.glob(pattern)))
    seen: set[Path] = set()
    for path in candidates:
        if path in seen or not path.is_file():
            continue
        seen.add(path)
        text = path.read_text(encoding="utf-8", errors="replace")
        m = _LICENSE_RE.search(text)
        if m:
            version = f" {m.group(1)}" if m.group(1) else ""
            license_name = f"Creative Commons Attribution-ShareAlike{version}".strip()
            # Capture the full line containing the match as the verbatim excerpt.
            line = next(
                (ln.strip() for ln in text.splitlines() if _LICENSE_RE.search(ln)),
                m.group(0),
            )
            return license_name, line
    raise LicenseError(
        f"No Creative Commons Attribution-ShareAlike license text found in {lahman_dir} "
        f"(or its parent). Refusing to proceed without verified CC BY-SA licensing."
    )


def resolve_edition(cache_dir: Path, lock_path: Path, *, pin: bool = False) -> EditionInfo:
    """Locate, license-verify, and checksum the cached edition.

    With ``pin=True`` (first-time setup) the computed digest is written to
    ``lock_path``. Otherwise the digest is verified against the committed lock and a
    mismatch raises EditionError.
    """
    lahman_dir = locate_lahman(cache_dir)
    license_name, excerpt = verify_license(lahman_dir)
    through = _through_year(lahman_dir)
    digest = _digest(lahman_dir)
    edition = f"lahman-{through}"

    if pin:
        lock_path.write_text(
            json.dumps(
                {"edition": edition, "through_year": through, "sha256": digest,
                 "license_name": license_name, "license_excerpt": excerpt},
                indent=2, sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )
    elif lock_path.exists():
        lock = json.loads(lock_path.read_text(encoding="utf-8"))
        if lock.get("sha256") != digest:
            raise EditionError(
                f"Cached Lahman edition checksum {digest} does not match the pinned lock "
                f"{lock.get('sha256')} in {lock_path}. Re-pin with --pin if the edition "
                f"changed intentionally."
            )
    # If no lock exists and pin is False, we proceed on the freshly computed digest
    # (the lock will be created on the first --pin run once the operator confirms it).

    return EditionInfo(
        edition=edition,
        through_year=through,
        sha256=digest,
        license_name=license_name,
        license_excerpt=excerpt,
    )


def write_attribution(out_dir: Path, info: EditionInfo) -> Path:
    """Emit public/data/ATTRIBUTION.json with the verified edition + license."""
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "ATTRIBUTION.json"
    path.write_text(
        json.dumps(
            {
                "source": "Lahman Database",
                "edition": info.edition,
                "throughYear": info.through_year,
                "license": info.license_name,
                "licenseExcerpt": info.license_excerpt,
                "sha256": info.sha256,
                "disclaimer": "Not affiliated with or endorsed by MLB or the MLBPA.",
            },
            indent=2, sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )
    return path
