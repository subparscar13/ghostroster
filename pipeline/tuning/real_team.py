"""Build the best 9 + 3 + 1 roster for one or more real team-seasons using the
committed pipeline math (z-score era vectors, D-011), and emit them as sim-ready
JSON for `real_team.ts` to simulate.

This is an OFFLINE comparison tool (reads the Lahman cache; the sim it feeds stays
pure). The roster is the engine's "best lineup": the 9 hitters with the highest
wOBA-ish value, the 3 lowest-allowed-value starters, and the best reliever — the
same value the calibration tooling uses. Defensive positions are ignored (the sim
doesn't model defense), so this is a best-bats lineup, not a fielding alignment.

Usage (from pipeline/):
  uv run python tuning/real_team.py OUT.json TEAM:YEAR:Label [TEAM:YEAR:Label ...]
  e.g. ... SEA:2001:"2001 Mariners" NYA:1927:"1927 Yankees"
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

from ghostroster_pipeline import eligibility, vectors
from ghostroster_pipeline.download import locate_lahman
from ghostroster_pipeline.tables import Tables

REPO = Path(__file__).resolve().parents[2]
CACHE = REPO / "pipeline" / ".cache"
W = {"bb": 0.69, "b1": 0.89, "b2": 1.27, "b3": 1.62, "hr": 2.10}
value = lambda v: sum(W[k] * v[k] for k in W)


def main() -> None:
    out_path = Path(sys.argv[1])
    specs = [a.split(":", 2) for a in sys.argv[2:]]
    if not specs:
        raise SystemExit("usage: real_team.py OUT.json TEAM:YEAR:Label ...")

    tables = Tables.from_cache(CACHE)
    dist_hit = vectors.league_hitter_dist(tables)
    dist_pitch = vectors.league_pitcher_dist(tables)
    league_hit = vectors.league_hitter_rates(tables)
    names = {
        r["playerID"]: f"{(r.get('nameFirst') or '')} {(r.get('nameLast') or '')}".strip()
        for _, r in tables.people.iterrows()
    }
    eh = eligibility.eligible_hitter_seasons(tables)
    ep = eligibility.eligible_pitcher_seasons(tables)

    # Real W-L straight from the raw Teams.csv (the loaded Tables drops W/L).
    core = locate_lahman(CACHE)
    raw_teams = pd.read_csv(core / "Teams.csv", usecols=["yearID", "teamID", "W", "L"])

    strip_h = lambda h: {"playerId": h["playerId"], "name": h["name"], "pos": ["DH"], "vector": h["vector"]}
    strip_p = lambda p: {"playerId": p["playerId"], "name": p["name"], "role": p["role"], "allowed": p["allowed"], "stamina": p["stamina"]}

    # Looser fill pool: a team's full batting, for topping up a lineup when fewer
    # than 9 bats clear the everyday floor (e.g. a catching platoon). PA >= 150 keeps
    # the rate sample sane (the floor's whole point), and pitchers are excluded.
    bat = tables.batting.copy()
    for c in ["yearID", "AB", "H", "2B", "3B", "HR", "BB", "HBP", "SF", "SH"]:
        bat[c] = pd.to_numeric(bat.get(c, 0), errors="coerce").fillna(0)
    bat["PA"] = bat["AB"] + bat["BB"] + bat["HBP"] + bat["SF"] + bat["SH"]

    results = []
    for team, year_s, label in specs:
        year = int(year_s)
        H = eh[(eh.yearID == year) & (eh.teamID == team)]
        P = ep[(ep.yearID == year) & (ep.teamID == team)]
        pitcher_ids = set(P["playerID"])

        elig_ids = set(H["playerID"])
        hitters = sorted(
            ({"playerId": r["playerID"], "name": names.get(r["playerID"], r["playerID"]),
              "vector": vectors.hitter_vector(r, dist_hit), "belowFloor": False} for _, r in H.iterrows()),
            key=lambda h: -value(h["vector"]),
        )
        below: list[str] = []
        if len(hitters) < 9:
            fill = bat[(bat.yearID == year) & (bat.teamID == team) & (bat.PA >= 150)]
            extra = sorted(
                ({"playerId": r["playerID"], "name": names.get(r["playerID"], r["playerID"]),
                  "vector": vectors.hitter_vector(r, dist_hit), "belowFloor": True}
                 for _, r in fill.iterrows()
                 if r["playerID"] not in elig_ids and r["playerID"] not in pitcher_ids),
                key=lambda h: -value(h["vector"]),
            )
            for h in extra:
                if len(hitters) >= 9:
                    break
                hitters.append(h)
                below.append(h["name"])
        hitters.sort(key=lambda h: -value(h["vector"]))
        sp, rp = [], []
        for _, r in P.iterrows():
            rec = {"playerId": r["playerID"], "name": names.get(r["playerID"], r["playerID"]),
                   "role": r["role"], "allowed": vectors.pitcher_allowed_vector(r, dist_pitch, league_hit),
                   "stamina": vectors.stamina(r)}
            (sp if r["role"] == "SP" else rp).append(rec)
        sp.sort(key=lambda p: value(p["allowed"]))
        rp.sort(key=lambda p: value(p["allowed"]))

        if len(hitters) < 9 or len(sp) < 3 or len(rp) < 1:
            print(f"!! {label}: insufficient eligible players "
                  f"({len(hitters)}H/{len(sp)}SP/{len(rp)}RP) — skipped")
            continue

        tw = raw_teams[(raw_teams.yearID == year) & (raw_teams.teamID == team)]
        real = f"{int(tw['W'].iloc[0])}-{int(tw['L'].iloc[0])}" if not tw.empty else "?"
        lineup9 = hitters[:9]
        results.append({
            "label": label, "teamId": team, "year": year, "realRecord": real,
            "roster": {
                "lineup": [strip_h(h) for h in lineup9],
                "rotation": [strip_p(p) for p in sp[:3]],
                "bullpen": [strip_p(rp[0])],
            },
            "lineupNames": [h["name"] for h in lineup9],
            "rotationNames": [p["name"] for p in sp[:3]],
            "closer": rp[0]["name"],
            "belowFloor": [h["name"] for h in lineup9 if h["belowFloor"]],
        })
        flag = f"  [below-floor fill: {', '.join(results[-1]['belowFloor'])}]" if results[-1]["belowFloor"] else ""
        print(f"   {label} (real {real}): {results[-1]['lineupNames']} | {results[-1]['rotationNames']} | {results[-1]['closer']}{flag}")

    out_path.write_text(json.dumps(results))
    print(f"\nwrote {len(results)} roster(s) → {out_path}")


if __name__ == "__main__":
    main()
