/**
 * Attribution footer — required on EVERY screen (FR-011, constitution III): Lahman /
 * SABR credit + CC BY-SA, the MLB/MLBPA non-affiliation disclaimer, the text-only
 * note (FR-012), and the tip-jar link. Rendered in the root layout so it appears on
 * every route. Update TIP_JAR once a real Ko-fi-style link exists.
 */

import { CommentBox } from "./CommentBox";

const TIP_JAR = "https://ko-fi.com/"; // TODO: replace with the real tip-jar URL at launch

export function Footer() {
  return (
    <footer className="mx-auto max-w-3xl px-4 py-6 text-center font-mono text-[11px] leading-relaxed text-ink-faint">
      <p>
        Data:{" "}
        <a
          href="https://sabr.org/lahman-database/"
          className="underline decoration-faded underline-offset-2 hover:text-ink"
        >
          Lahman Database
        </a>{" "}
        (Sean Lahman / SABR · lahman-2025), licensed CC BY-SA. Negro Leagues excluded.
      </p>
      <p className="mt-1">Franchises shown as text only — not affiliated with or endorsed by MLB or the MLBPA.</p>
      <p className="mt-1">
        <a href={TIP_JAR} className="underline decoration-faded underline-offset-2 hover:text-ink">
          tip jar
        </a>
        <CommentBox />
      </p>
    </footer>
  );
}
