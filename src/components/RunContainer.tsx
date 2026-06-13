"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { loadChunk, loadTeamsIndex } from "@/lib/data";
import { draftHitter, draftPitcher, isComplete } from "@/lib/draft";
import { clearRun, loadRun, saveRun } from "@/lib/storage";
import type { DraftPick, PoolHitter, PoolPitcher, SpinCell, TeamDecadeChunk, TeamsIndex } from "@/lib/types";
import { DraftScreen } from "./DraftScreen";
import { RosterSidebar } from "./RosterSidebar";
import { SpinScreen } from "./SpinScreen";

type Phase = "spin" | "draft" | "simulate";
type Rerolls = { team: number; era: number };

export function RunContainer() {
  const [index, setIndex] = useState<TeamsIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [rerollsUsed, setRerollsUsed] = useState<Rerolls>({ team: 0, era: 0 });
  const [phase, setPhase] = useState<Phase>("spin");

  const [chunk, setChunk] = useState<TeamDecadeChunk | null>(null);
  const [chunkLoading, setChunkLoading] = useState(false);

  // Load the index + resume any in-progress run (client-only; no SSR hydration risk).
  useEffect(() => {
    loadTeamsIndex().then(setIndex).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    const saved = loadRun();
    if (saved) {
      setPicks(saved.picks);
      setRerollsUsed(saved.rerollsUsed);
      if (isComplete(saved.picks)) setPhase("simulate");
    }
  }, []);

  const round = picks.length + 1;

  const goSpin = () => {
    setChunk(null);
    setPhase("spin");
  };

  const onConfirmCell = (cell: SpinCell) => {
    setChunkLoading(true);
    setPhase("draft");
    loadChunk(cell.chunk)
      .then(setChunk)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setChunkLoading(false));
  };

  const commit = (next: DraftPick[]) => {
    setPicks(next);
    saveRun({ rerollsUsed, picks: next });
    if (isComplete(next)) setPhase("simulate");
    else goSpin();
  };

  const onPickHitter = (h: PoolHitter, tag: string) => {
    const next = draftHitter(h, tag, picks);
    if (next) commit(next);
  };
  const onPickPitcher = (p: PoolPitcher, tag: string) => {
    const next = draftPitcher(p, tag, picks);
    if (next) commit(next);
  };

  const startOver = () => {
    clearRun();
    setPicks([]);
    setRerollsUsed({ team: 0, era: 0 });
    setChunk(null);
    setPhase("spin");
  };

  if (error) {
    return (
      <div className="mx-auto max-w-sm px-6 pt-16 text-center">
        <p className="font-mono text-sm text-vintage">Something went wrong loading the data.</p>
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
        onConsumeReroll={(type) =>
          setRerollsUsed((r) => {
            const next = { ...r, [type]: r[type] + 1 };
            saveRun({ rerollsUsed: next, picks });
            return next;
          })
        }
        onConfirm={onConfirmCell}
      />
    );
  }

  if (phase === "draft") {
    if (chunkLoading || !chunk) {
      return <p className="mx-auto px-6 pt-16 text-center font-mono text-sm text-ink-faint">Loading roster…</p>;
    }
    return (
      <DraftScreen
        chunk={chunk}
        picks={picks}
        round={round}
        onPickHitter={onPickHitter}
        onPickPitcher={onPickPitcher}
      />
    );
  }

  // simulate (placeholder until T044)
  return (
    <div className="mx-auto max-w-md px-4 pt-12 pb-10 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-vintage">Roster complete</p>
      <h1 className="mt-1 font-display text-3xl font-medium uppercase">13 ghosts assembled</h1>
      <div className="my-5 rounded-lg border border-faded/60 bg-paper-dark/40 p-3">
        <RosterSidebar picks={picks} />
      </div>
      <p className="font-mono text-sm text-ink-soft">Season simulation lands in T044.</p>
      <button
        onClick={startOver}
        className="mt-6 font-mono text-xs uppercase tracking-widest text-navy underline underline-offset-4"
      >
        Start a new run
      </button>
      <Link href="/" className="mt-3 block font-mono text-xs uppercase tracking-widest text-ink-faint underline underline-offset-4">
        Home
      </Link>
    </div>
  );
}
