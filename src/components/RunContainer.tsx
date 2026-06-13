"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { loadChunk, loadTeamsIndex } from "@/lib/data";
import { buildSimRoster, draftHitter, draftPitcher, isComplete } from "@/lib/draft";
import { clearRun, loadRun, saveRun } from "@/lib/storage";
import type { DraftPick, PoolHitter, PoolPitcher, SpinCell, TeamDecadeChunk, TeamsIndex } from "@/lib/types";
import { LEAGUE_AVERAGE_OPPONENT } from "@/sim/baseline";
import { simulateSeason } from "@/sim/season";
import { DraftScreen } from "./DraftScreen";
import { ResultScreen } from "./ResultScreen";
import { SimulateScreen } from "./SimulateScreen";
import { SpinScreen } from "./SpinScreen";

type Phase = "spin" | "draft" | "simulate" | "result";
type Rerolls = { team: number; era: number };

const randomSeed = () => Math.floor(Math.random() * 0xffffffff) >>> 0;

export function RunContainer() {
  const [index, setIndex] = useState<TeamsIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [rerollsUsed, setRerollsUsed] = useState<Rerolls>({ team: 0, era: 0 });
  const [seed, setSeed] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("spin");

  const [chunk, setChunk] = useState<TeamDecadeChunk | null>(null);
  const [chunkLoading, setChunkLoading] = useState(false);

  useEffect(() => {
    loadTeamsIndex().then(setIndex).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    const saved = loadRun();
    if (saved) {
      setPicks(saved.picks);
      setRerollsUsed(saved.rerollsUsed);
      if (saved.seed != null) setSeed(saved.seed);
      if (isComplete(saved.picks)) setPhase("result"); // resume straight to result (skip ticker)
    }
  }, []);

  // The season result — pure + memoized; identical for the same (picks, seed).
  const result = useMemo(() => {
    if (!isComplete(picks) || seed == null) return null;
    try {
      return simulateSeason(buildSimRoster(picks), LEAGUE_AVERAGE_OPPONENT, seed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [picks, seed]);

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
    if (isComplete(next)) {
      const s = seed ?? randomSeed();
      setSeed(s);
      setPhase("simulate");
      saveRun({ rerollsUsed, picks: next, seed: s });
    } else {
      saveRun({ rerollsUsed, picks: next, ...(seed != null ? { seed } : {}) });
      goSpin();
    }
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
    setSeed(null);
    setChunk(null);
    setPhase("spin");
  };

  if (error) {
    return (
      <div className="mx-auto max-w-sm px-6 pt-16 text-center">
        <p className="font-mono text-sm text-vintage">Something went wrong.</p>
        <p className="mt-2 font-mono text-xs text-ink-faint">{error}</p>
        <button onClick={startOver} className="mt-6 font-mono text-xs uppercase tracking-widest text-navy underline underline-offset-4">
          Start over
        </button>
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
            saveRun({ rerollsUsed: next, picks, ...(seed != null ? { seed } : {}) });
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
      <DraftScreen chunk={chunk} picks={picks} round={round} onPickHitter={onPickHitter} onPickPitcher={onPickPitcher} />
    );
  }

  if (!result) {
    return <p className="mx-auto px-6 pt-16 text-center font-mono text-sm text-ink-faint">Simulating…</p>;
  }

  if (phase === "simulate") {
    return <SimulateScreen result={result} onDone={() => setPhase("result")} />;
  }

  return <ResultScreen result={result} picks={picks} onReplay={startOver} />;
}
