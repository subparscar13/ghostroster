"use client";

import { useEffect, useRef, useState } from "react";

import { fetchRosterCount, leaderboardEnabled } from "@/lib/leaderboard";

/** Subtle footer ticker: total ghost rosters built across all players. Gated on the
 * leaderboard endpoint (same backend); renders nothing until it has a count. */
export function RosterTicker() {
  if (!leaderboardEnabled()) return null;
  return <Inner />;
}

function Inner() {
  const [shown, setShown] = useState<number | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    let live = true;
    fetchRosterCount().then((target) => {
      if (!live || target == null) return;
      // brief count-up for a ticker feel (~1s, ease-out), then settle on the value.
      const from = Math.max(0, target - Math.min(target, 60));
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 900);
        const eased = 1 - (1 - p) ** 3;
        setShown(Math.round(from + (target - from) * eased));
        if (p < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    });
    return () => {
      live = false;
      cancelAnimationFrame(raf.current);
    };
  }, []);

  if (shown == null) return null;
  return (
    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint/80" aria-live="off">
      {shown.toLocaleString()} ghost rosters built
    </p>
  );
}
