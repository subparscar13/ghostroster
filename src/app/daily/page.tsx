import Link from "next/link";

/**
 * Daily challenge: shared date-seeded run, one attempt, spoiler-safe share (M4
 * T052–T053). T040 placeholder establishes the route.
 */
export default function Daily() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-16 text-center">
      <h1 className="font-display text-2xl font-medium uppercase tracking-wide">Daily challenge</h1>
      <p className="mt-3 font-mono text-sm text-ink-soft">Same seed for everyone, one attempt — coming in M4.</p>
      <Link href="/" className="mt-8 font-mono text-xs uppercase tracking-widest text-navy underline underline-offset-4">
        Back
      </Link>
    </div>
  );
}
