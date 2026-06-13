import Link from "next/link";

/**
 * Title screen (M3 T040 shell). The interactive run (spin → draft → simulate →
 * result) replaces this content as client state in T041+. For now it establishes
 * the vintage look and the entry point.
 */
export default function Home() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-16 pb-10 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-vintage">est. 1871 · all eras</p>

      <h1 className="mt-3 font-display text-5xl font-medium uppercase tracking-wide text-ink">
        Ghost Roster
      </h1>

      <div className="my-4 h-px w-24 bg-ink" />

      <p className="max-w-xs text-balance text-lg leading-relaxed text-ink-soft">
        Spin a random franchise and decade, draft thirteen ghosts of baseball past, and
        chase the impossible: <span className="font-mono text-vintage">162&ndash;0</span>.
      </p>

      <Link
        href="/play"
        className="mt-8 rounded-lg bg-vintage px-10 py-3 font-mono text-sm uppercase tracking-[0.2em] text-paper transition-transform hover:scale-[1.02] active:scale-95"
      >
        Spin to start
      </Link>

      <Link
        href="/daily"
        className="mt-4 font-mono text-xs uppercase tracking-widest text-navy underline decoration-faded underline-offset-4 hover:text-ink"
      >
        Daily challenge
      </Link>

      <ol className="mt-12 grid w-full grid-cols-3 gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
        <li className="rounded-md border border-faded px-2 py-3">1 · spin</li>
        <li className="rounded-md border border-faded px-2 py-3">2 · draft 13</li>
        <li className="rounded-md border border-faded px-2 py-3">3 · sim 162</li>
      </ol>
    </div>
  );
}
