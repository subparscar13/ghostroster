"use client";

import { useEffect, useRef, useState } from "react";

import { randomCell } from "@/lib/spin";
import type { SpinCell, TeamsIndex } from "@/lib/types";

type Props = {
  index: TeamsIndex;
  target: SpinCell;
  round: number;
  onDone: () => void;
};

const ROLL_MS = 850;
const HOLD_MS = 450;
const FLICKER_MS = 70;

/** Slot-machine reel animation (T041/T044): flickers the franchise + decade reels,
 * lands on `target`, holds briefly, then `onDone` advances to the roster page.
 * Reduced-motion users skip straight through. Runs once per mount — the parent
 * remounts it (via key) to replay on each spin / re-roll. */
export function SpinAnimation({ index, target, round, onDone }: Props) {
  const [cell, setCell] = useState<SpinCell>(target);
  const [landed, setLanded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCell(target);
      setLanded(true);
      const t = setTimeout(onDone, 150);
      return () => clearTimeout(t);
    }
    const start = performance.now();
    const tick = () => {
      if (performance.now() - start >= ROLL_MS) {
        setCell(target);
        setLanded(true);
        timer.current = setTimeout(onDone, HOLD_MS);
        return;
      }
      setCell(randomCell(index.cells, Math.random));
      timer.current = setTimeout(tick, FLICKER_MS);
    };
    tick();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 pt-14 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">Round {round} of 13</p>
      <div className="mb-6 mt-2 h-px w-20 bg-ink" />
      <div className="w-full space-y-3">
        <Reel label="Franchise" value={cell.franchise} dim={!landed} />
        <Reel label="Decade" value={`${cell.decade}s`} dim={!landed} mono />
      </div>
      <p className="mt-8 font-mono text-sm uppercase tracking-[0.2em] text-ink-faint">
        {landed ? "Loading roster…" : "Spinning…"}
      </p>
    </div>
  );
}

function Reel({ label, value, dim, mono }: { label: string; value: string; dim?: boolean; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-ink px-4 py-3 text-left">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">{label}</div>
      <div className={`mt-1 truncate ${mono ? "font-mono" : "font-display"} text-2xl uppercase tracking-wide ${dim ? "text-paper/60" : "text-paper"}`}>
        {value}
      </div>
    </div>
  );
}
