import Link from "next/link";

/**
 * The run: spin → draft → simulate → result, as client state (built in T041–T045).
 * T040 placeholder establishes the route.
 */
export default function Play() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-16 text-center">
      <h1 className="font-display text-2xl font-medium uppercase tracking-wide">The run</h1>
      <p className="mt-3 font-mono text-sm text-ink-soft">Spin / draft / simulate — coming in T041.</p>
      <Link href="/" className="mt-8 font-mono text-xs uppercase tracking-widest text-navy underline underline-offset-4">
        Back
      </Link>
    </div>
  );
}
