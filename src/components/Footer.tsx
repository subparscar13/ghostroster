/**
 * Attribution footer — required on EVERY screen (FR-011, constitution III): Lahman /
 * SABR credit, the MLB/MLBPA non-affiliation disclaimer, and the tip-jar link.
 */
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
        (CC BY-SA) · not affiliated with or endorsed by MLB or the MLBPA
      </p>
      <p className="mt-1">
        franchises shown as text only ·{" "}
        <a href="https://ko-fi.com/" className="underline decoration-faded underline-offset-2 hover:text-ink">
          tip jar
        </a>
      </p>
    </footer>
  );
}
