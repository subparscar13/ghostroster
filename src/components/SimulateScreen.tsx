"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { SeasonResult } from "@/sim/types";

/** Skippable season ticker (T044). The sim has already run; this just animates the
 * W-L climbing toward the final over ~1.6s for drama, then hands off to the result.
 * Cut-order item #1 — deliberately thin and skippable. */
export function SimulateScreen({ result, onDone }: { result: SeasonResult; onDone: () => void }) {
  const games = result.gameLogs.length;
  const cumulativeWins = useMemo(() => {
    const arr: number[] = [];
    let w = 0;
    for (const g of result.gameLogs) {
      if (g.win) w++;
      arr.push(w);
    }
    return arr;
  }, [result]);

  const [idx, setIdx] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      onDone();
      return;
    }
    const duration = 1600;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const g = Math.round(t * games);
      setIdx(g);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else setTimeout(onDone, 250);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [games, onDone]);

  const played = Math.min(idx, games);
  const wins = played === 0 ? 0 : (cumulativeWins[played - 1] ?? 0);
  const losses = played - wins;
  const pct = games === 0 ? 0 : (played / games) * 100;

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 pt-20 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">Playing the season</p>
      <div className="my-6 font-mono text-5xl text-vintage">
        {wins}&ndash;{losses}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-paper-dark">
        <div className="h-full bg-navy transition-[width] duration-75" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
        Game {played} of {games}
      </p>
      <button
        onClick={onDone}
        className="mt-10 font-mono text-xs uppercase tracking-widest text-navy underline underline-offset-4"
      >
        Skip to result
      </button>
    </div>
  );
}
