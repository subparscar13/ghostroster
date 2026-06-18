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


def _era_names(tables: Tables) -> dict[tuple, str]:
    """(franchID, decade) -> era-appropriate display name: the name that franchise used
    most in that decade (tiebreak: latest year). So the 1990s Expos read 'Montreal
    Expos', not the franchise's current name 'Washington Nationals'."""
    t = tables.teams[["yearID", "franchID", "name"]].copy()
    t["yearID"] = pd.to_numeric(t["yearID"], errors="coerce")
    t = t.dropna(subset=["yearID", "franchID", "name"])
    t["decade"] = (t["yearID"] // 10 * 10).astype(int)
    out: dict[tuple, str] = {}
    for (fr, dec), grp in t.groupby(["franchID", "decade"]):
        agg = grp.groupby("name")["yearID"].agg(count="count", last="max")
        best = agg.sort_values(["count", "last"], ascending=[False, False]).index[0]
        out[(fr, int(dec))] = str(best)
    return out


def _allstar_seasons(tables: Tables) -> set[tuple]:
    """{(playerID, yearID)} for every season a player made an All-Star team."""
    a = tables.allstar
    if a.empty:
        return set()
    years = pd.to_numeric(a["yearID"], errors="coerce")
    return {(pid, int(y)) for pid, y in zip(a["playerID"], years) if pd.notna(y)}


def _hof_players(tables: Tables) -> set[str]:
    """{playerID} inducted to the Hall of Fame as a Player (career-level)."""
    h = tables.halloffame
    if h.empty:
        return set()
    inducted = h[(h["inducted"] == "Y") & (h["category"] == "Player")]
    return set(inducted["playerID"])


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


def _hitter_obj(row: pd.Series, names, positions, dist_hit, allstars, hof) -> dict:
    key = (row["playerID"], int(row["yearID"]), row["teamID"])
    return {
        "playerId": row["playerID"],
        "name": names.get(row["playerID"], row["playerID"]),
        "allStar": (row["playerID"], int(row["yearID"])) in allstars,
        "hof": row["playerID"] in hof,
        "pos": positions.get(key, ["DH"]),
        "display": {
            "year": int(row["yearID"]), "team": row["teamID"],
            "G": int(row["G"]), "PA": int(row["PA"]), "AB": int(row["AB"]),
            "H": int(row["H"]), "2B": int(row["2B"]), "3B": int(row["3B"]),
            "HR": int(row["HR"]), "BB": int(row["BB"]), "HBP": int(row["HBP"]),
            "SO": int(row.get("SO", 0)),
            "AVG": f"{row['AVG']:.3f}", "OPS": f"{row['OPS']:.3f}",
        },
        "vector": vectors.hitter_vector(row, dist_hit),
    }


def _pitcher_obj(row: pd.Series, names, dist_pitch, league_hit, allstars, hof) -> dict:
    return {
        "playerId": row["playerID"],
        "name": names.get(row["playerID"], row["playerID"]),
        "allStar": (row["playerID"], int(row["yearID"])) in allstars,
        "hof": row["playerID"] in hof,
        "role": row["role"],
        "display": {
            "year": int(row["yearID"]), "team": row["teamID"],
            "W": int(row["W"]), "L": int(row["L"]), "ERA": f"{row['ERA']:.2f}",
            "G": int(row["G"]), "GS": int(row["GS"]), "IP": round(float(row["IP"]), 1),
            "H": int(row["H"]), "BB": int(row["BB"]), "SO": int(row["SO"]), "HR": int(row["HR"]),
        },
        "allowed": vectors.pitcher_allowed_vector(row, dist_pitch, league_hit),
        "stamina": vectors.stamina(row),
    }


_VAL_W = {"bb": 0.69, "b1": 0.89, "b2": 1.27, "b3": 1.62, "hr": 2.10}


def _vec_value(v: dict) -> float:
    return sum(_VAL_W[k] * v[k] for k in _VAL_W)


def _cell_strength(chunk: dict) -> float:
    """Rough roster strength: top-9 hitter value minus the best 3 SP + 1 RP allowed
    value (lower allowed = better). Used only to pick each franchise's marquee decade
    for the daily Sunday All-Star pool (D-015)."""
    hv = sorted((_vec_value(h["vector"]) for h in chunk["hitters"]), reverse=True)[:9]
    sp = sorted(_vec_value(p["allowed"]) for p in chunk["pitchers"] if p["role"] == "SP")[:3]
    rp = sorted(_vec_value(p["allowed"]) for p in chunk["pitchers"] if p["role"] == "RP")[:1]
    return sum(hv) - sum(sp) - sum(rp)


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
    league_hit = vectors.league_hitter_rates(tables)  # pitcher hit-type split only
    dist_hit = vectors.league_hitter_dist(tables)
    dist_pitch = vectors.league_pitcher_dist(tables)
    era_names = _era_names(tables)
    allstars = _allstar_seasons(tables)
    hof = _hof_players(tables)
    out_dir = Path(out_dir)
    # Clear stale chunks first so the output is EXACTLY the emitted set — otherwise an
    # eligibility/threshold change leaves orphan chunks from prior runs, which both
    # ships dead data and breaks determinism (output would depend on run history).
    td_dir = out_dir / "td"
    if td_dir.exists():
        for stale in td_dir.glob("*.json"):
            stale.unlink()
    td_dir.mkdir(parents=True, exist_ok=True)

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

        franch_name = era_names.get((franch, int(decade))) or (
            str(hb["franchName"].iloc[0]) if len(hb) else str(pb["franchName"].iloc[0])
        )
        hb = hb.sort_values(["OPS", "playerID"], ascending=[False, True])
        sp = sp.sort_values(["ERA", "playerID"], ascending=[True, True])
        rp = rp.sort_values(["ERA", "playerID"], ascending=[True, True])

        chunk = {
            "franchiseId": franch, "franchise": franch_name, "decade": int(decade),
            "hitters": [_hitter_obj(r, names, positions, dist_hit, allstars, hof) for _, r in hb.iterrows()],
            "pitchers": (
                [_pitcher_obj(r, names, dist_pitch, league_hit, allstars, hof) for _, r in sp.iterrows()]
                + [_pitcher_obj(r, names, dist_pitch, league_hit, allstars, hof) for _, r in rp.iterrows()]
            ),
        }
        _dump(out_dir / "td" / f"{franch}-{int(decade)}.json", chunk)
        cells.append({
            "franchiseId": franch, "franchise": franch_name, "decade": int(decade),
            "chunk": f"td/{franch}-{int(decade)}.json",
            "counts": {"hitters": len(hb), "sp": len(sp), "rp": len(rp)},
            "_strength": _cell_strength(chunk),
        })

    cells.sort(key=lambda c: (c["franchiseId"], c["decade"]))
    # Mark each franchise's strongest decade for the daily Sunday All-Star pool (D-015);
    # ties break to the earliest decade (cells are sorted, so first-seen wins on >).
    best_val: dict[str, float] = {}
    best_dec: dict[str, int] = {}
    for c in cells:
        f = c["franchiseId"]
        if f not in best_val or c["_strength"] > best_val[f]:
            best_val[f] = c["_strength"]
            best_dec[f] = c["decade"]
    for c in cells:
        c["allStar"] = best_dec[c["franchiseId"]] == c["decade"]
        del c["_strength"]
    _dump(out_dir / "teams.json", {
        "edition": edition, "generatedFrom": "Lahman Database", "cells": cells,
    })
    return {"cells": len(cells), "dropped": dropped}
