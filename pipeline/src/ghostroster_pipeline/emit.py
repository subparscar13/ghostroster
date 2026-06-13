"""Assemble and emit the static JSON contract (T017).

Applies the eligibility floor (≥ 9 hitters, ≥ 3 SP, ≥ 1 RP) — cells below it are
excluded from teams.json — and writes teams.json + td/{franchID}-{decade}.json
deterministically (sorted keys, stable order, fixed rounding, compact separators)
so a fixed Lahman edition yields byte-identical output (constitution V).
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from . import vectors
from .tables import Tables

MIN_HITTERS, MIN_SP, MIN_RP = 9, 3, 1

_POS_COLS = {"G_c": "C", "G_1b": "1B", "G_2b": "2B", "G_3b": "3B", "G_ss": "SS",
             "G_lf": "LF", "G_cf": "CF", "G_rf": "RF", "G_of": "OF", "G_dh": "DH"}


def _name_map(tables: Tables) -> dict[str, str]:
    p = tables.people
    return {
        r["playerID"]: f"{r.get('nameFirst', '') or ''} {r.get('nameLast', '') or ''}".strip()
        for _, r in p.iterrows()
    }


def _positions(tables: Tables) -> dict[tuple, list[str]]:
    """(playerID, yearID, teamID) -> eligible fielding slots (games ≥ 10, desc; at
    least the single most-played slot). DH-loose: the app lets anyone DH."""
    app = tables.appearances.copy()
    cols = [c for c in _POS_COLS if c in app.columns]
    for c in cols:
        app[c] = pd.to_numeric(app[c], errors="coerce").fillna(0)
    out: dict[tuple, list[str]] = {}
    for _, r in app.iterrows():
        played = [(_POS_COLS[c], int(r[c])) for c in cols if r[c] > 0]
        if not played:
            continue
        played.sort(key=lambda x: (-x[1], x[0]))
        keep = [pos for pos, g in played if g >= 10] or [played[0][0]]
        out[(r["playerID"], int(r["yearID"]), r["teamID"])] = keep
    return out


def _hitter_obj(row: pd.Series, names, positions, league_hit) -> dict:
    key = (row["playerID"], int(row["yearID"]), row["teamID"])
    return {
        "playerId": row["playerID"],
        "name": names.get(row["playerID"], row["playerID"]),
        "pos": positions.get(key, ["DH"]),
        "display": {
            "year": int(row["yearID"]), "team": row["teamID"],
            "G": int(row["G"]), "PA": int(row["PA"]), "AB": int(row["AB"]),
            "H": int(row["H"]), "2B": int(row["2B"]), "3B": int(row["3B"]),
            "HR": int(row["HR"]), "BB": int(row["BB"]), "HBP": int(row["HBP"]),
            "SO": int(row.get("SO", 0)),
            "AVG": f"{row['AVG']:.3f}", "OPS": f"{row['OPS']:.3f}",
        },
        "vector": vectors.hitter_vector(row, league_hit),
    }


def _pitcher_obj(row: pd.Series, names, league_pitch, league_hit) -> dict:
    return {
        "playerId": row["playerID"],
        "name": names.get(row["playerID"], row["playerID"]),
        "role": row["role"],
        "display": {
            "year": int(row["yearID"]), "team": row["teamID"],
            "W": int(row["W"]), "L": int(row["L"]), "ERA": f"{row['ERA']:.2f}",
            "G": int(row["G"]), "GS": int(row["GS"]), "IP": round(float(row["IP"]), 1),
            "H": int(row["H"]), "BB": int(row["BB"]), "SO": int(row["SO"]), "HR": int(row["HR"]),
        },
        "allowed": vectors.pitcher_allowed_vector(row, league_pitch, league_hit),
        "stamina": vectors.stamina(row),
    }


def _dump(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def build(
    best_hitters: pd.DataFrame,
    best_pitchers: pd.DataFrame,
    tables: Tables,
    edition: str,
    out_dir: Path,
) -> dict:
    """Write teams.json + td chunks. Returns a summary dict (counts, dropped cells)."""
    names = _name_map(tables)
    positions = _positions(tables)
    league_hit = vectors.league_hitter_rates(tables)
    league_pitch = vectors.league_pitcher_rates(tables)
    out_dir = Path(out_dir)
    (out_dir / "td").mkdir(parents=True, exist_ok=True)

    cells: list[dict] = []
    dropped = 0
    keys = sorted(
        set(map(tuple, best_hitters[["franchID", "decade"]].dropna().values.tolist()))
        | set(map(tuple, best_pitchers[["franchID", "decade"]].dropna().values.tolist()))
    )
    for franch, decade in keys:
        hb = best_hitters[(best_hitters["franchID"] == franch) & (best_hitters["decade"] == decade)]
        pb = best_pitchers[(best_pitchers["franchID"] == franch) & (best_pitchers["decade"] == decade)]
        sp = pb[pb["role"] == "SP"]
        rp = pb[pb["role"] == "RP"]
        if len(hb) < MIN_HITTERS or len(sp) < MIN_SP or len(rp) < MIN_RP:
            dropped += 1
            continue

        franch_name = str(hb["franchName"].iloc[0]) if len(hb) else str(pb["franchName"].iloc[0])
        hb = hb.sort_values(["OPS", "playerID"], ascending=[False, True])
        sp = sp.sort_values(["ERA", "playerID"], ascending=[True, True])
        rp = rp.sort_values(["ERA", "playerID"], ascending=[True, True])

        chunk = {
            "franchiseId": franch, "franchise": franch_name, "decade": int(decade),
            "hitters": [_hitter_obj(r, names, positions, league_hit) for _, r in hb.iterrows()],
            "pitchers": (
                [_pitcher_obj(r, names, league_pitch, league_hit) for _, r in sp.iterrows()]
                + [_pitcher_obj(r, names, league_pitch, league_hit) for _, r in rp.iterrows()]
            ),
        }
        _dump(out_dir / "td" / f"{franch}-{int(decade)}.json", chunk)
        cells.append({
            "franchiseId": franch, "franchise": franch_name, "decade": int(decade),
            "chunk": f"td/{franch}-{int(decade)}.json",
            "counts": {"hitters": len(hb), "sp": len(sp), "rp": len(rp)},
        })

    cells.sort(key=lambda c: (c["franchiseId"], c["decade"]))
    _dump(out_dir / "teams.json", {
        "edition": edition, "generatedFrom": "Lahman Database", "cells": cells,
    })
    return {"cells": len(cells), "dropped": dropped}
