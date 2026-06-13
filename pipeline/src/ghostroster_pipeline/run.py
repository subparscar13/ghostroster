"""Pipeline entry point (T017): download-verify → eligibility → best season →
vectors → emit. Deterministic; same pinned edition in → byte-identical JSON out.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from . import download, eligibility, emit, stats
from .tables import Tables


def run_pipeline(cache_dir: Path, out_dir: Path, lock_path: Path, *, pin: bool = False) -> dict:
    info = download.resolve_edition(cache_dir, lock_path, pin=pin)
    download.write_attribution(out_dir, info)

    tables = Tables.from_cache(cache_dir)
    best_hitters = stats.best_hitter_seasons(eligibility.eligible_hitter_seasons(tables))
    best_pitchers = stats.best_pitcher_seasons(eligibility.eligible_pitcher_seasons(tables))
    summary = emit.build(best_hitters, best_pitchers, tables, info.edition, out_dir)
    summary["edition"] = info.edition
    summary["license"] = info.license_name
    return summary


def main() -> None:
    here = Path(__file__).resolve()
    repo_root = here.parents[3]  # pipeline/src/ghostroster_pipeline/run.py -> repo root
    ap = argparse.ArgumentParser(prog="ghostroster-pipeline")
    ap.add_argument("--cache", type=Path, default=repo_root / "pipeline" / ".cache")
    ap.add_argument("--out", type=Path, default=repo_root / "public" / "data")
    ap.add_argument("--lock", type=Path, default=repo_root / "pipeline" / "edition.lock.json")
    ap.add_argument("--pin", action="store_true", help="record edition SHA-256 + license to the lock")
    args = ap.parse_args()

    summary = run_pipeline(args.cache, args.out, args.lock, pin=args.pin)
    print(
        f"[ghostroster] {summary['edition']} ({summary['license']}): "
        f"{summary['cells']} cells emitted, {summary['dropped']} below floor → {args.out}"
    )


if __name__ == "__main__":
    main()
