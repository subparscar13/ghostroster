import type { Metadata } from "next";
import Link from "next/link";

/**
 * Player-facing "how it works" page — a curated, themed companion to the technical
 * docs/how-the-sim-works.md (dev doc stays in the repo). Static server component, no
 * client state. Keeps the fun parts (dice metaphor, the Ruth example, the top-10
 * lists, the real-team comparison) and drops file paths / formulas / governance.
 */
export const metadata: Metadata = {
  title: "How it works — Ghost Roster",
  description:
    "How Ghost Roster turns real career stats into a 162-game season: loaded dice, era grading, and real baseball — no hidden ratings.",
};

const OUTCOMES: [string, string][] = [
  ["walk", "a base on balls (a hit-by-pitch counts here too)"],
  ["1B", "a single"],
  ["2B", "a double"],
  ["3B", "a triple"],
  ["HR", "a home run"],
  ["out", "anything that makes an out"],
];

// Ruth's 1920 die, laid out 0→1 (the number line). [label, width%, tone]
const RUTH_DIE: [string, number, string][] = [
  ["walk", 21.1, "bg-gold/70"],
  ["1B", 2.0, "bg-navy/70"],
  ["2B", 5.9, "bg-navy/55"],
  ["3B", 0.5, "bg-navy/40"],
  ["HR", 9.6, "bg-vintage"],
  ["out", 60.9, "bg-faded"],
];

const POSITIONS: [string, string][] = [
  ["Catcher", "Don Padgett ('39) · Bill Dickey ('43) · Ernie Lombardi ('42) · Smoky Burgess ('54) · Mike Piazza ('97) · Joe Mauer ('09)"],
  ["First base", "Nap Lajoie ('10) · Harry Heilmann ('23) · Rod Carew ('77) · Luis Arraez ('23) · George Sisler ('20) · John Olerud ('93)"],
  ["Second base", "Nap Lajoie ('10) · Rogers Hornsby ('25) · Paul Molitor ('87) · Eddie Collins ('15) · Rod Carew ('69) · DJ LeMahieu ('16)"],
  ["Third base", "George Brett ('80) · Miguel Cabrera ('13) · Wade Boggs ('87) · Chipper Jones ('08) · Joe Torre ('71) · Cecil Travis ('41)"],
  ["Shortstop", "Luke Appling ('36) · Arky Vaughan ('35) · Nomar Garciaparra ('00) · Lou Boudreau ('48) · Alan Trammell ('87) · Corey Seager ('23)"],
  ["Outfield", "Ty Cobb ('11) · Tris Speaker ('16) · Joe Jackson ('11) · Ted Williams ('41) · Tony Gwynn ('94) · Sam Crawford ('11)"],
  ["Designated hitter", "Aaron Judge ('24) · John Olerud ('93) · Yandy Díaz ('23) · Magglio Ordóñez ('07) · Manny Ramírez ('02) · Josh Hamilton ('10)"],
  ["Starting pitcher", "Pedro Martínez ('00) · Bob Feller ('39) · Walter Johnson ('24) · Bob Gibson ('68) · Stan Coveleski ('17) · Vean Gregg ('11)"],
  ["Relief pitcher", "Mike Adams ('09) · Koji Uehara ('13) · Billy Wagner ('99) · Craig Kimbrel ('12) · Dennis Eckersley ('90) · Rich Gossage ('81)"],
];

const REAL_TEAMS: [string, string, string, string][] = [
  // team, real record, sim avg, beats-real
  ["1927 Yankees", "110–44", "130–32", "100%"],
  ["2001 Mariners", "116–46", "129–33", "99%"],
  ["1998 Yankees", "114–48", "128–34", "99%"],
  ["1975 Reds", "108–54", "117–45", "96%"],
  ["2005 Cardinals", "100–62", "110–52", "96%"],
];

function Section({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-vintage">{kicker}</p>
      <h2 className="mt-1 font-display text-2xl text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-2xl px-5 pt-12 pb-16">
      <p className="text-center font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">Ghost Roster</p>
      <h1 className="mt-2 text-center font-display text-4xl font-medium text-ink">How it works</h1>
      <div className="mx-auto my-5 h-px w-24 bg-ink" />
      <p className="text-center text-lg leading-relaxed text-ink-soft">
        Ghost Roster doesn&rsquo;t decide games with a hidden rating. It plays real baseball &mdash; one
        plate appearance at a time &mdash; from each player&rsquo;s actual career numbers. Here&rsquo;s how those
        stats become wins, no math required.
      </p>

      <Section kicker="The big idea" title="Every player is a set of loaded dice">
        <p>
          The simulation only cares about one thing: <span className="text-ink">how likely each outcome is</span>{" "}
          when a player steps to the plate. Every hitter (and pitcher) becomes six numbers that add up to 100%:
        </p>
        <table className="w-full border-collapse font-mono text-sm">
          <tbody>
            {OUTCOMES.map(([k, v]) => (
              <tr key={k} className="border-b border-faded/50">
                <td className="w-20 py-1.5 pr-3 text-gold-ink">{k}</td>
                <td className="py-1.5 text-ink-soft">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Think of it as a six-sided die <span className="italic">weighted</span>{" "}for that player. Prime Babe
          Ruth&rsquo;s die comes up &ldquo;walk&rdquo; or &ldquo;home run&rdquo; far more than anyone else&rsquo;s; a
          weak bat comes up &ldquo;out&rdquo; most of the time. The batting averages and ERAs on the draft cards
          are just there to help you choose &mdash; the engine never looks at them. It only rolls the die.
        </p>
      </Section>

      <Section kicker="Step 1" title="Grading on each era&rsquo;s curve">
        <p>
          Baseball from the 1920s and the 2000s are almost different sports. If we used raw numbers, modern
          sluggers would dominate just because their <span className="italic">era</span>{" "}hit more home runs. So we
          grade every player against <span className="text-ink">the spread of his own era&rsquo;s regulars</span>
          {" "}&mdash;{" "} how far above (or below) the pack he stood.
        </p>
        <p>
          <span className="text-ink">1920 Babe Ruth:</span> he walked and homered far more than a typical 1920
          regular, so his walk slice swells to about <span className="font-mono text-ink">21%</span>{" "}and his
          home-run slice to about <span className="font-mono text-ink">10%</span>{" "}&mdash;{" "} roughly three times a
          normal hitter. Great, but believable: a modern slugger with the same raw totals grades out lower,
          because his league was already full of power.
        </p>
      </Section>

      <Section kicker="Step 2" title="The matchup: batter vs. pitcher">
        <p>
          A plate appearance is a duel. Before each roll, the engine combines the batter&rsquo;s die and the
          pitcher&rsquo;s die: a strikeout artist drags the hitter toward &ldquo;out,&rdquo; a slugger drags it toward
          &ldquo;home run,&rdquo; with league-average as the anchor.
        </p>
        <p>
          1920 Ruth&rsquo;s die normally shows ~10% home runs. Put him against prime Pedro Martínez, who almost
          never allowed one, and the blend reweights him down to about <span className="font-mono text-ink">4%</span>{" "}
          homers with far more outs. Still great &mdash; just human against the best.
        </p>
      </Section>

      <Section kicker="Step 3" title="Rolling the die, and scoring runs">
        <p>Lay the six slices end-to-end from 0 to 1 and roll once. This is Ruth&rsquo;s 1920 die:</p>
        <div className="overflow-hidden rounded-md border border-faded">
          <div className="flex h-9 w-full text-[10px] font-mono">
            {RUTH_DIE.map(([label, w, tone]) => (
              <div
                key={label}
                className={`flex items-center justify-center ${tone} text-paper`}
                style={{ width: `${w}%` }}
                title={`${label} ${w}%`}
              >
                {w >= 5 ? label : ""}
              </div>
            ))}
          </div>
        </div>
        <p className="font-mono text-xs text-ink-faint">
          A roll of 0.35 lands in the home-run stretch &rarr; home run. A 0.90 is an out.
        </p>
        <p>Then runners move by a simple, written-down rulebook:</p>
        <ul className="ml-1 space-y-1 text-sm">
          <li>&bull; <span className="text-ink">Home run</span>{" "}&mdash;{" "}batter and everyone on base score.</li>
          <li>&bull; <span className="text-ink">Triple</span>{" "}&mdash;{" "}all runners score; batter to third.</li>
          <li>&bull; <span className="text-ink">Double</span>{" "}&mdash;{" "}runners on 2nd/3rd score; a runner on 1st to 3rd.</li>
          <li>&bull; <span className="text-ink">Single</span>{" "}&mdash;{" "}runner on 3rd scores; one on 2nd scores half the time.</li>
          <li>&bull; <span className="text-ink">Walk</span>{" "}&mdash;{" "}everyone advances only if forced.</li>
          <li>&bull; <span className="text-ink">Out</span>{" "}&mdash;{" "}one out; nobody moves.</li>
        </ul>
        <p>
          Three outs end a half-inning, nine innings end a game, and 162 games make a season. The same seed
          always produces the same rolls on any device &mdash; that&rsquo;s why the daily challenge is identical for
          everyone.
        </p>
      </Section>

      <Section kicker="The proof" title="Who the engine rates highest">
        <p>
          Ask the engine who it rates best at each spot and you get a mix of <span className="italic">many</span>{" "}
          eras &mdash; exactly what grading on each era&rsquo;s curve should do. (Ranked by the engine&rsquo;s own value, not
          by raw stats or any all-time list.)
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {POSITIONS.map(([pos, names]) => (
            <div key={pos} className="rounded-lg border border-faded/60 bg-paper-dark/40 p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-gold-ink">{pos}</p>
              <p className="mt-1 text-[13px] leading-snug text-ink-soft">{names}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section kicker="A sanity check" title="How real teams stack up">
        <p>
          Drop a famous real team&rsquo;s best lineup into the engine and play 5,000 seasons against a
          league-average opponent. Real greatness lands around 110&ndash;130 wins &mdash; and none of them reach
          162-0, which stays reserved for hand-picked all-eras dream teams.
        </p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/30 text-left font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              <th className="py-1.5 pr-2 font-normal">Team (real)</th>
              <th className="py-1.5 pr-2 font-normal">Sim avg</th>
              <th className="py-1.5 font-normal">Beats real</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {REAL_TEAMS.map(([team, real, sim, beat]) => (
              <tr key={team} className="border-b border-faded/50">
                <td className="py-1.5 pr-2 text-ink">{team} <span className="text-ink-faint">{real}</span></td>
                <td className="py-1.5 pr-2 text-vintage">{sim}</td>
                <td className="py-1.5 text-ink-soft">{beat}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="font-mono text-xs text-ink-faint">
          They beat their real win totals because here they face a fixed league-average opponent, not the real
          league that also had other strong clubs.
        </p>
      </Section>

      <Section kicker="Honest limits" title="What it leaves out">
        <p>To stay fast, fair, and explainable, the engine does not model:</p>
        <ul className="ml-1 space-y-1 text-sm">
          <li>&bull; Defense and fielding (a glove never matters; position only affects drafting)</li>
          <li>&bull; Ballparks (no Coors or Fenway effects)</li>
          <li>&bull; Baserunning, stolen bases, lefty/righty splits</li>
          <li>&bull; Pitcher fatigue, bullpen depth, clutch hitting</li>
        </ul>
        <p>
          It also uses each player&rsquo;s single best season with a team-decade and bats the lineup by offensive
          quality. Intentional simplifications &mdash; the goal is a believable, replayable, era-spanning game,
          not a perfect forecast.
        </p>
      </Section>

      <div className="mt-12 flex flex-col items-center gap-3">
        <Link
          href="/play"
          className="rounded-lg bg-vintage px-10 py-3 font-mono text-sm uppercase tracking-[0.2em] text-paper transition-transform hover:scale-[1.02] active:scale-95"
        >
          Back to the game
        </Link>
        <a
          href="https://github.com/subparscar13/ghostroster"
          className="font-mono text-[11px] uppercase tracking-widest text-navy underline decoration-faded underline-offset-4 hover:text-ink"
        >
          Source on GitHub
        </a>
      </div>
    </div>
  );
}
