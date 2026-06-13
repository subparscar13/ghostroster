"""Shared fixtures. ``mini_lahman`` writes a tiny, schema-valid Lahman edition to a
temp dir so the whole pipeline is testable before the real CSVs are downloaded.
"""

from __future__ import annotations

from pathlib import Path

import pytest

# A minimal but schema-valid slice: one franchise (NYA) across the 1920s with
# enough players to (almost) field a roster, plus a readme carrying CC BY-SA text.
_README = (
    "Lahman Baseball Database\n"
    "Copyright 1996-2026 by Sean Lahman.\n\n"
    "This work is licensed under a Creative Commons "
    "Attribution-ShareAlike 3.0 Unported License.\n"
)

_TEAMS = """yearID,lgID,teamID,franchID,name,G,R,AB,H,2B,3B,HR,BB,SO,HBP,SF,HA,HRA,BBA,SOA,IPouts
1921,AL,NYA,NYY,New York Yankees,153,948,5267,1576,285,90,134,529,481,30,0,1490,80,470,500,4131
1921,AL,BOS,BOS,Boston Red Sox,154,668,5223,1432,251,75,17,452,492,25,0,1502,55,455,470,4140
"""

# Batting: a handful of NYA 1921 hitters (>=20 G) + one ineligible (low G).
_BATTING = """playerID,yearID,teamID,lgID,G,AB,R,H,2B,3B,HR,RBI,SB,BB,SO,IBB,HBP,SF,SH
ruthba01,1921,NYA,AL,152,540,177,204,44,16,59,168,17,145,81,0,4,0,0
meusebo01,1921,NYA,AL,149,599,92,189,24,16,24,135,17,42,88,0,2,0,0
pippwa01,1921,NYA,AL,153,588,96,186,35,9,8,97,17,49,40,0,3,0,0
wardaa01,1921,NYA,AL,153,606,92,170,24,5,5,75,14,69,53,0,2,0,0
schasc01,1921,NYA,AL,52,180,20,45,7,2,1,22,3,15,18,0,1,0,0
mcnaja01,1921,NYA,AL,121,398,48,118,16,5,1,55,5,37,22,0,1,0,0
bakerfr01,1921,NYA,AL,94,330,46,97,16,2,9,71,1,26,28,0,1,0,0
fewstch01,1921,NYA,AL,81,180,30,49,8,3,1,18,4,21,19,0,1,0,0
deveca01,1921,NYA,AL,41,96,15,25,4,1,0,12,2,9,11,0,0,0,0
miljo01,1921,NYA,AL,12,30,3,7,1,0,0,3,0,2,5,0,0,0,0
"""

# Pitching: 3 SP (>=10 GS) + 1 RP (>=20 relief app, GS small) + 1 ineligible.
_PITCHING = """playerID,yearID,teamID,lgID,W,L,G,GS,IPouts,H,ER,HR,BB,SO,BFP,HBP,ERA
maysca01,1921,NYA,AL,27,9,49,38,1011,332,121,17,76,70,1438,5,3.05
hoytwa01,1921,NYA,AL,19,13,43,32,847,301,98,11,81,102,1226,4,3.09
shawbo01,1921,NYA,AL,18,12,38,31,791,297,110,12,79,68,1170,6,3.76
quinnja01,1921,NYA,AL,8,7,32,3,331,140,52,5,21,29,470,2,4.24
collira01,1921,NYA,AL,11,5,22,5,330,140,40,4,21,38,460,2,3.27
"""

_APPEARANCES = """playerID,yearID,teamID,G_all,GS,G_c,G_1b,G_2b,G_3b,G_ss,G_lf,G_cf,G_rf,G_of,G_dh,G_p
ruthba01,1921,NYA,152,150,0,0,0,0,0,17,0,135,152,0,0
meusebo01,1921,NYA,149,149,0,0,0,0,0,123,0,26,149,0,0
pippwa01,1921,NYA,153,153,0,153,0,0,0,0,0,0,0,0,0
wardaa01,1921,NYA,153,153,0,0,153,0,0,0,0,0,0,0,0
schasc01,1921,NYA,52,50,0,0,0,52,0,0,0,0,0,0,0
mcnaja01,1921,NYA,121,120,0,0,0,0,121,0,0,0,0,0,0
bakerfr01,1921,NYA,94,90,0,0,0,94,0,0,0,0,0,0,0
fewstch01,1921,NYA,81,70,0,0,0,0,0,20,40,20,80,0,0
deveca01,1921,NYA,41,30,41,0,0,0,0,0,0,0,0,0,0
miljo01,1921,NYA,12,10,0,0,0,0,12,0,0,0,0,0,0
maysca01,1921,NYA,49,38,0,0,0,0,0,0,0,0,0,0,49
hoytwa01,1921,NYA,43,32,0,0,0,0,0,0,0,0,0,0,43
shawbo01,1921,NYA,38,31,0,0,0,0,0,0,0,0,0,0,38
quinnja01,1921,NYA,32,3,0,0,0,0,0,0,0,0,0,0,32
collira01,1921,NYA,22,5,0,0,0,0,0,0,0,0,0,0,22
"""

_PEOPLE = """playerID,nameFirst,nameLast,nameGiven
ruthba01,Babe,Ruth,George Herman
meusebo01,Bob,Meusel,Robert William
pippwa01,Wally,Pipp,Walter Clement
wardaa01,Aaron,Ward,Aaron Lee
schasc01,Wally,Schang,Walter Henry
mcnaja01,Mike,McNally,Michael Joseph
bakerfr01,Frank,Baker,John Franklin
fewstch01,Chick,Fewster,Wilson Lloyd
deveca01,Al,DeVormer,Albert Edward
miljo01,Johnny,Mitchell,John Franklin
maysca01,Carl,Mays,Carl William
hoytwa01,Waite,Hoyt,Waite Charles
shawbo01,Bob,Shawkey,James Robert
quinnja01,Jack,Quinn,John Picus
collira01,Rip,Collins,Harry Warren
"""

_FRANCHISES = """franchID,franchName,active
NYY,New York Yankees,Y
BOS,Boston Red Sox,Y
"""


@pytest.fixture
def mini_lahman(tmp_path: Path) -> Path:
    """Write the synthetic edition under tmp_path/.cache/core and return the cache dir."""
    core = tmp_path / ".cache" / "lahman_1871-2021_csv" / "core"
    core.mkdir(parents=True)
    (core / "Batting.csv").write_text(_BATTING, encoding="utf-8")
    (core / "Pitching.csv").write_text(_PITCHING, encoding="utf-8")
    (core / "Fielding.csv").write_text("playerID,yearID,teamID,POS,G\n", encoding="utf-8")
    (core / "Appearances.csv").write_text(_APPEARANCES, encoding="utf-8")
    (core / "Teams.csv").write_text(_TEAMS, encoding="utf-8")
    (core / "People.csv").write_text(_PEOPLE, encoding="utf-8")
    (core / "TeamsFranchises.csv").write_text(_FRANCHISES, encoding="utf-8")
    (core.parent / "readme.txt").write_text(_README, encoding="utf-8")
    return tmp_path / ".cache"
