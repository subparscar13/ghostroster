"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { loadTeamsIndex } from "@/lib/data";
import type { SpinCell, TeamsIndex } from "@/lib/types";
import { SpinScreen } from "./SpinScreen";

type Phase = "spin" | "draft" | "simulate" | "result";

/** Hosts a full run's client state. T041 wires the spin phase; draft/simulate/result
 * land in T043–T045 (the 13-round loop + localStorage resume arrive with the draft). */
export function RunContainer() {
  const [index, setIndex] = useState<TeamsIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("spin");
  const [round] = useState(1);
  const [cell, setCell] = useState<SpinCell | null>(null);
  const [rerollsUsed, setRerollsUsed] = useState({ team: 0, era: 0 });

  useEffect(() => {
    loadTeamsIndex()
      .then(setIndex)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-sm px-6 pt-16 text-center">
        <p className="font-mono text-sm text-vintage">Couldn&apos;t load the spin index.</p>
        <p className="mt-2 font-mono text-xs text-ink-faint">{error}</p>
      </div>
    );
  }
  if (!index) {
    return <p className="mx-auto px-6 pt-16 text-center font-mono text-sm text-ink-faint">Loading…</p>;
  }

  if (phase === "spin") {
    return (
      <SpinScreen
        index={index}
        round={round}
        rerollsUsed={rerollsUsed}
        onConsumeReroll={(type) => setRerollsUsed((r) => ({ ...r, [type]: r[type] + 1 }))}
        onConfirm={(c) => {
          setCell(c);
          setPhase("draft");
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 pt-16 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">Now drafting</p>
      <h1 className="mt-2 font-display text-3xl font-medium uppercase">
        {cell?.decade}s {cell?.franchise}
      </h1>
      <p className="mt-4 font-mono text-sm text-ink-soft">
        Draft board ({cell?.counts.hitters} hitters · {cell?.counts.sp} SP · {cell?.counts.rp} RP) — coming
        in T043.
      </p>
      <Link href="/" className="mt-8 inline-block font-mono text-xs uppercase tracking-widest text-navy underline underline-offset-4">
        End run
      </Link>
    </div>
  );
}
