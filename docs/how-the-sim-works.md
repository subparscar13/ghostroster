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

So we **grade every player on the curve of their own era**:

```
player's chance of an outcome  =  how often THEY did it  ÷  how often their LEAGUE did it that year
```

Then we drop that "how much better than average" ratio into one **neutral, modern-ish
baseline** so everyone is finally measured on the same field.

**Example — 1920 Babe Ruth.** Ruth homered several times more often than a typical 1920
hitter. He was *enormously* above his league's curve. Applied to the neutral baseline,
that makes his home-run slice balloon to about **33%** — a cartoonishly good die, which
is exactly right: in his era he was a cartoon. A modern slugger with the same raw home
run total grades out *lower*, because his league already hit a ton of homers, so he was
less of an outlier.

Pitchers get a die the same way, but built from what they *gave up* (walks, hits, home
runs allowed), so a great pitcher's die is mostly "out."

This all happens once, offline, in a Python pipeline — the results are saved as data the
website downloads. (Curious? It's `pipeline/src/ghostroster_pipeline/vectors.py`, the
`_project` function.)

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

**Seeing the tug-of-war:** 1920 Ruth's die normally shows ~33% home runs. Put him against
an elite ace who almost never allows homers, and the blend reweights him to roughly 16%
home runs with far more outs. He's still great — just human against the best.

---

## Step 3 — Rolling the die (one plate appearance)

To turn the six percentages into a single result, we lay them end-to-end on a number
line from 0 to 1 and roll once:

```
bb [0 – .256)   1B [.256 – .352)   2B [.352 – .412)   3B [.412 – .418)   HR [.418 – .747)   out [.747 – 1)
        (this is 1920 Ruth's die, laid out)
```

A random number, say **0.55**, falls in the home-run stretch → **home run**. A 0.90 would
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

1. Ruth's die (from his real 1920 season): `HR 33% · walk 26% · single 10% · double 6% ·
   triple 0.5% · out 25%`.
2. He's facing the league-average team, so the matchup math leaves his die unchanged.
3. The random roll is 0.55 → **home run.**
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
- A few **early-era names (1910s–20s)** rank surprisingly high. Offense was scarce back
  then, so a player who towered over *that* environment grades out as elite today. This
  also exposes a known rough edge: the deeper the dead-ball era, the more even a
  modest-looking line gets amplified (a candidate for future tuning).
- **Designated hitters and pitchers skew modern** — the DH is a modern role, and the
  data's nastiest strikeout arms are recent.

A player appears under every position they were eligible to play; ranking uses the same
value the draft/calibration tooling uses.

**Catcher (C)** — Bill Salkeld ('45 PIT) · Rudy York ('37 DET) · Earl Smith ('21 NY1) · Bill DeLancey ('34 SLN) · Ernie Lombardi ('45 NY1) · Gabby Hartnett ('30 CHN) · Mickey Cochrane ('31 PHA) · Bill Dickey ('36 NYA) · Aaron Robinson ('46 NYA) · Jack Meyers ('12 NY1)

**First base (1B)** — Lou Gehrig ('27 NYA) · Jimmie Foxx ('32 PHA) · Johnny Mize ('46 NY1) · George Sisler ('20 SLA) · Hank Aaron ('71 ATL) · Harry Heilmann ('23 DET) · Dolph Camilli ('41 BRO) · Hank Greenberg ('38 DET) · Dick Allen ('72 CHA) · Willie McCovey ('69 SFN)

**Second base (2B)** — Rogers Hornsby ('25 SLN) · Smoky Joe Wood ('18 CLE) · Nap Lajoie ('10 CLE) · Joe Morgan ('76 CIN) · Bobby Doerr ('44 BOS) · Larry Doyle ('11 NY1) · Russ Wrightstone ('25 PHI) · Marty Kavanagh ('15 DET) · Joe Gordon ('42 NYA) · Eddie Collins ('15 CHA)

**Third base (3B)** — Jimmie Foxx ('32 PHA) · Mike Schmidt ('81 PHI) · Rudy York ('37 DET) · Al Rosen ('53 CLE) · George Brett ('80 KCA) · Gary Sheffield ('92 SDN) · Russ Wrightstone ('25 PHI) · Pedro Guerrero ('85 LAN) · Miguel Cabrera ('13 DET) · Bill Robinson ('76 PIT)

**Shortstop (SS)** — Arky Vaughan ('35 PIT) · Vern Stephens ('43 SLA) · Russ Wrightstone ('25 PHI) · Troy Tulowitzki ('14 COL) · Hanley Ramirez ('13 LAN) · Rico Petrocelli ('69 BOS) · Howard Johnson ('89 NYN) · Lou Boudreau ('48 CLE) · Jimmy Dykes ('29 PHA) · Eddie Lake ('45 BOS)

**Outfield (LF/CF/RF)** — Babe Ruth ('20 NYA) · Ted Williams ('41 BOS) · Ken Williams ('23 SLA) · Cy Williams ('26 PHI) · Tillie Walker ('22 PHA) · Mel Ott ('44 NY1) · Hack Wilson ('30 CHN) · Smoky Joe Wood ('18 CLE) · Ty Cobb ('11 DET) · Goose Goslin ('30 SLA)

**Designated hitter (DH)** — Aaron Judge ('24 NYA) · Frank Thomas ('94 CHA) · Cecil Fielder ('90 DET) · Jim Thome ('02 CLE) · Champ Summers ('79 DET) · Jason Giambi ('01 OAK) · John Mayberry ('75 KCA) · Manny Ramirez ('02 BOS) · Mike Napoli ('11 TEX) · Josh Hamilton ('10 TEX)

**Starting pitcher (SP)** — Pedro Martinez ('00 BOS) · Clayton Kershaw ('16 LAN) · Greg Maddux ('94 ATL) · Jake Arrieta ('15 CHN) · Cy Blanton ('35 PIT) · Willie Mitchell ('13 CLE) · Zack Greinke ('15 LAN) · Dolf Luque ('23 CIN) · Chris Sale ('18 BOS) · Justin Verlander ('22 HOU)

**Relief pitcher (RP)** — Mike Adams ('09 SDN) · Craig Kimbrel ('21 CHN) · Koji Uehara ('13 BOS) · Dennis Eckersley ('90 OAK) · Hung-Chih Kuo ('10 LAN) · Aroldis Chapman ('25 BOS) · Ryan Brasier ('23 LAN) · Joey Devine ('08 OAK) · Sean Doolittle ('18 WAS) · David Robertson ('17 NYA)

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
