# How the simulation works (plain-English guide)

Ghost Roster doesn't decide games with a hidden "rating." It plays actual baseball —
one plate appearance at a time — using each player's real career numbers. This guide
explains how those stats turn into wins, with no math background required.

---

## The big idea: every player is a set of loaded dice

The simulation only understands one thing about a player: **how likely each outcome is
when they step up to the plate.** We boil every hitter (and every pitcher) down to six
numbers that add up to 100%:

| Outcome | What it means |
|---|---|
| `bb` | a walk (a hit-by-pitch counts here too) |
| `1B` | a single |
| `2B` | a double |
| `3B` | a triple |
| `HR` | a home run |
| `out` | anything that makes an out |

Think of it as a **six-sided die that's been weighted** for that specific player. Prime
Babe Ruth's die comes up "home run" about a third of the time. A weak-hitting backup's
die comes up "out" 75%+ of the time. **This die is the only thing the engine rolls.**

> The stats you see on the draft card — batting average, OPS, ERA — are just there to
> help you choose. The engine never looks at them. It only rolls the die.

There are two steps to building and using that die: first we **make a fair die from a
real season**, then we **adjust it for the matchup** before each roll.

---

## Step 1 — Making a fair die from a real season ("grading on a curve")

Baseball from the 1920s and baseball from the 2000s are almost different sports. In
1920, home runs were rare; by 2000 they were everywhere. If we used raw numbers, modern
sluggers would dominate just because their *era* hit more homers — not because they were
better relative to their peers.

So we **grade every player against the spread of his own era's regulars** — how far above
(or below) the pack he stood, measured in *standard deviations*:

```
player's edge on an outcome  =  how many standard deviations he was above (or below)
                                 the typical everyday regular of his league that year
```

A standard deviation is just "a normal-sized gap from average." Being two of them above
the mean means you were near the very top of your peers; being below the mean drags the
slice down. We take that edge and nudge a single **neutral, modern-ish baseline** up or
down by it, so everyone is finally measured on the same field.

**Example — 1920 Babe Ruth.** Ruth walked and homered far more often than a typical 1920
regular — several standard deviations clear of the pack on both. So his walk slice swells
to about **21%** and his home-run slice to about **10%** (roughly three times the neutral
baseline). Note it's *not* a cartoonish 33%: grading against the actual spread of players,
not a raw ratio to a tiny dead-ball league rate, keeps even the greatest outlier
believable. (His *single* slice actually shrinks — relative to his era he turned would-be
singles into extra bases and walks.) A modern slugger with the same raw home-run total
grades out lower, because his league was already full of sluggers, so he stood out less.

Pitchers get a die the same way, but built from what they *gave up* (walks, hits, home
runs allowed) versus their era's pitchers, so a great pitcher's die is mostly "out."

This all happens once, offline, in a Python pipeline — the results are saved as data the
website downloads. (Curious? It's `pipeline/src/ghostroster_pipeline/vectors.py`, the
`_project_z` function; the math is recorded in decision-log **D-011**.)

---

## Step 2 — Adjusting for the matchup (the batter vs. the pitcher)

A plate appearance is a *duel*. A great hitter does worse against a great pitcher, and
vice-versa. So before each roll, we combine the batter's die and the pitcher's die,
measured against league average, using a standard baseball method (the "odds ratio"):

```
combined chance of an outcome  ∝  (batter's chance × pitcher's chance) ÷ league's chance
```

…then we rescale so the six slices add back to 100%. In plain terms: **a strikeout-heavy
pitcher drags the hitter's die toward "out"; a slugger drags it toward "home run"; the
league average is the tug-of-war's anchor.**

A nice property falls out of this: if a hitter faces a perfectly *average* pitcher, the
math cancels and you get back **exactly the hitter's own die.** In today's version of the
game, your opponent is always "the league-average team," so in practice **your hitters
swing exactly as their data says, and your pitchers suppress runs exactly as theirs
does.** (The same machinery is ready for a future player-vs-player mode, where a real
opponent's die would slot in.)

**Seeing the tug-of-war:** 1920 Ruth's die normally shows ~10% home runs. Put him against
an elite ace (prime Pedro Martínez, who almost never allowed homers), and the blend
reweights him to roughly 4% home runs with far more outs (~78%). He's still great — just
human against the best.

---

## Step 3 — Rolling the die (one plate appearance)

To turn the six percentages into a single result, we lay them end-to-end on a number
line from 0 to 1 and roll once:

```
bb [0 – .211)   1B [.211 – .230)   2B [.230 – .289)   3B [.289 – .294)   HR [.294 – .390)   out [.390 – 1)
        (this is 1920 Ruth's die, laid out)
```

A random number, say **0.35**, falls in the home-run stretch → **home run**. A 0.90 would
be an out. Because each player's slices are sized by their stats, **a great hitter simply
lands on good outcomes more often.** That's the entire weighting, made visible.

The randomness comes from a **seeded** generator: the same seed always produces the same
rolls, on any device. That's why the daily challenge is identical for everyone and why a
result is perfectly reproducible.

---

## Step 4 — From rolls to runs (simple, honest baseball)

One roll gives an outcome; now runners move. We use a deliberately **simple, written-down
rulebook** (no hidden cleverness):

- **Home run** → the batter and everyone on base score.
- **Triple** → every runner scores; batter to third.
- **Double** → runners on 2nd and 3rd score; runner on 1st to 3rd; batter to 2nd.
- **Single** → runner on 3rd scores; runner on 2nd scores half the time (otherwise stops
  at 3rd); runner on 1st to 2nd; batter to 1st.
- **Walk** → everyone advances only if forced (bases loaded walks in a run).
- **Out** → one out; nobody advances. (No double plays or sacrifice flies in this
  version — kept intentionally simple.)

Three outs end a half-inning; nine innings (or extras if tied) end a game; the starting
pitcher works innings 1–6 and the reliever finishes; 162 games make a season. Add it all
up and you get a record, box scores, and streaks.

So a stat's "weight" is really just: **how much it sizes the slices of the die — which,
rolled ~76 times a game across 162 games, compounds into wins and losses.**

---

## Putting it together: one trip to the plate

1. Ruth's die (from his real 1920 season): `walk 21% · HR 10% · double 6% · single 2% ·
   triple 0.5% · out 61%`.
2. He's facing the league-average team, so the matchup math leaves his die unchanged.
3. The random roll is 0.35 → **home run.**
4. There was a runner on first, so the rulebook scores **2 runs** and clears the bases.

Multiply that by thousands of plate appearances and you get a season that *feels* earned —
with a real game log you can scroll through, not just a number.

---

## Who the weighting elevates: the top 10 at each position

A good way to *see* the era-grading is to ask the engine who it rates highest at each
position. The lists below are ordered by the engine's **era-adjusted value** — how good
each player's loaded die is — across all of baseball history in the data. They are **not**
sorted by raw stats or by conventional all-time lists, and that's what makes them telling:

- Each list mixes **many different eras** — exactly what grading on each era's curve is
  supposed to do.
- A few **early-era names (1910s–20s)** rank high — Cobb, Speaker, Lajoie. Offense was
  scarce back then, so a player who towered over *that* environment grades out as elite
  today. (An earlier version *over*-amplified the dead ball, because it graded by a raw
  ratio to a tiny league rate; the standard-deviation grading in **D-011** fixed that, so
  these names are genuinely elite now rather than inflated.)
- **The designated-hitter list skews modern** — the DH is a modern role. The pitching
  lists, by contrast, span the whole timeline: prime Pedro Martínez sits beside Walter
  Johnson, Bob Feller, and Bob Gibson, because each is measured against his own era's arms.
- **Contact hitters rate well** — the value metric rewards reaching base and avoiding
  outs, so high-average, low-strikeout bats (Carew, Gwynn, Arraez, Boggs) grade out near
  the sluggers. That's a property of the metric, not a bug.

A player appears under every position they were eligible to play; ranking uses the same
value the draft/calibration tooling uses.

**Catcher (C)** — Don Padgett ('39 SLN) · Bill Dickey ('43 NYA) · Ernie Lombardi ('42 BSN) · Jack Meyers ('12 NY1) · Smoky Burgess ('54 PHI) · Babe Phelps ('36 BRO) · Joe Mauer ('09 MIN) · Mike Piazza ('97 LAN) · Elston Howard ('61 NYA) · Don Slaught ('92 PIT)

**First base (1B)** — Nap Lajoie ('10 CLE) · Harry Heilmann ('23 DET) · Rod Carew ('77 MIN) · Luis Arraez ('23 MIA) · George Sisler ('20 SLA) · Dale Alexander ('32 BOS) · Tito Francona ('59 CLE) · Andres Galarraga ('93 COL) · Carl Taylor ('69 PIT) · John Olerud ('93 TOR)

**Second base (2B)** — Nap Lajoie ('10 CLE) · Luis Arraez ('23 MIA) · Jose Iglesias ('24 NYN) · Rogers Hornsby ('25 SLN) · Paul Molitor ('87 ML4) · Jeff McNeil ('22 NYN) · Bobby Avila ('54 CLE) · Eddie Collins ('15 CHA) · Rod Carew ('69 MIN) · DJ LeMahieu ('16 COL)

**Third base (3B)** — George Brett ('80 KCA) · Jose Iglesias ('24 NYN) · Miguel Cabrera ('13 DET) · Joe Torre ('71 SLN) · Wade Boggs ('87 BOS) · Chipper Jones ('08 ATL) · Paul Molitor ('87 ML4) · Howie Kendrick ('19 WAS) · Luis Arraez ('19 MIN) · Cecil Travis ('41 WS1)

**Shortstop (SS)** — Luke Appling ('36 CHA) · Arky Vaughan ('35 PIT) · Nomar Garciaparra ('00 BOS) · Bobby Witt ('24 KCA) · Troy Tulowitzki ('14 COL) · Lou Boudreau ('48 CLE) · Hanley Ramirez ('13 LAN) · Cecil Travis ('41 WS1) · Alan Trammell ('87 DET) · Corey Seager ('23 TEX)

**Outfield (LF/CF/RF)** — Ty Cobb ('11 DET) · Tris Speaker ('16 CLE) · Shoeless Joe Jackson ('11 CLE) · Ted Williams ('41 BOS) · Harry Heilmann ('23 DET) · Tony Gwynn ('94 SDN) · Zack Wheat ('24 BRO) · Sam Crawford ('11 DET) · Tito Francona ('59 CLE) · Harvey Kuenn ('59 DET)

**Designated hitter (DH)** — Aaron Judge ('24 NYA) · John Olerud ('93 TOR) · Yandy Diaz ('23 TBA) · Magglio Ordonez ('07 DET) · Cecil Cooper ('80 ML4) · Paul Molitor ('87 ML4) · Joe Mauer ('09 MIN) · Darin Erstad ('00 ANA) · Manny Ramirez ('02 BOS) · Josh Hamilton ('10 TEX)

**Starting pitcher (SP)** — Pedro Martinez ('00 BOS) · Bob Feller ('39 CLE) · Walter Johnson ('24 WS1) · Jeff Tesreau ('12 NY1) · Willie Mitchell ('13 CLE) · Bob Gibson ('68 SLN) · Ferdie Schupp ('17 NY1) · Stan Coveleski ('17 CLE) · Vean Gregg ('11 CLE) · Sid Fernandez ('85 NYN)

**Relief pitcher (RP)** — Mike Adams ('09 SDN) · Koji Uehara ('13 BOS) · Billy Wagner ('99 HOU) · Craig Kimbrel ('12 ATL) · Dennis Eckersley ('90 OAK) · Norm Charlton ('95 SEA) · Joe Berry ('44 PHA) · Doug Henry ('91 ML4) · Sean Doolittle ('18 WAS) · Rich Gossage ('81 NYA)

## How real teams stack up

Another way to sanity-check the engine: drop a famous real team's best lineup into it
and play 5,000 seasons against the league-average opponent. Each player uses his actual
line from *that* season, graded by the same era z-score; the lineup is the **nine best
bats by value** (so defense and platoon roles are ignored).

| Team (real record) | Sim record (mean of 5,000) | Median | Range | Beats its real total | 162-0 |
|---|---|---|---|---|---|
| 1927 Yankees (110–44) | **130–32** | 130 | 107–148 | 100% | 0% |
| 2001 Mariners (116–46) | **129–33** | 129 | 107–144 | 99.3% | 0% |
| 1998 Yankees (114–48) | **128–34** | 128 | 109–144 | 99.6% | 0% |
| 1975 Reds (108–54) | **117–45** | 117 | 98–137 | 95.8% | 0% |
| 2005 Cardinals (100–62) | **110–52** | 110 | 87–129 | 95.8% | 0% |

What to read into it:

- **Every great real team comfortably beats its own real win total** (96–100% of seasons).
  That's expected — here they face a fixed league-*average* opponent all year, not the
  real league that also contained other strong clubs.
- **Murderers' Row (1927 Yankees) grades highest.** Ruth and Gehrig tower over the 1927
  curve, so the z-score loves them; the Big Red Machine and the balanced 2005 Cardinals
  sit a tier lower, paced by their stars but with less peak value top to bottom.
- **None reach 162-0**, and they top out around 148 wins. Even the best real rosters land
  well short of an optimized *all-eras* fantasy team (which goes 162-0 ~41% of the time) —
  a single real club can't match hand-picked peaks from a century of baseball. Good
  calibration: real greatness is ~110–130 wins here; perfection is reserved for the
  cross-era dream teams.

*Caveats: the opponent is league-average (not the real league that season); the lineup is
the nine best bats with no positions or defense; no pitcher fatigue. The 1927 lineup
borrows a second catcher (Johnny Grabowski) to fill nine, since the Yankees' catching
platoon left only eight everyday-floor regulars. Reproduce with*
`pipeline/tuning/real_team.py` *+* `real_team.ts`.

## What the simulation deliberately ignores

To stay fast, fair, and explainable, the engine leaves a lot out. It does **not** model:

- **Defense / fielding** (a player's glove never matters; position only affects drafting)
- **Ballparks** (no Coors Field or Fenway effects)
- **Baserunning skill, stolen bases, handedness/lefty-righty splits**
- **Pitcher fatigue, bullpen depth, clutch hitting, lineup protection**

It also uses each player's **single best season** with that team-decade, and bats your
lineup in order of offensive quality. These are intentional simplifications — the goal is
a believable, replayable, era-spanning game, not a perfect forecast.

---

## Why this approach

- **Fair across eras.** Grading on each era's curve lets 1909 and 2019 share a lineup
  honestly.
- **Explainable.** Every result traces back to dice you can read, not a black box.
- **Reproducible.** Seeded rolls mean the same roster + seed always plays out identically.
- **Real baseball.** You get box scores and stories to argue about — the whole point.

For the technically curious, the core lives in `src/sim/`: `baseline.ts` (the neutral
die), `resolve.ts` (the matchup blend + the roll), `baseout.ts` (the base-running
rulebook), and `season.ts` (stitching 162 games together). The era-grading happens
upstream in `pipeline/src/ghostroster_pipeline/vectors.py`.
