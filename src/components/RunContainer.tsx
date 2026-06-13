"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { loadChunk, loadTeamsIndex } from "@/lib/data";
import { buildSimRoster, draftHitter, draftPitcher, isComplete } from "@/lib/draft";
import { canRerollEra, canRerollTeam, randomCell, rerollEra, rerollTeam } from "@/lib/spin";
import { clearRun, loadRun, saveRun } from "@/lib/storage";
import type { DraftPick, PoolHitter, PoolPitcher, SpinCell, TeamDecadeChunk, TeamsIndex } from "@/lib/types";
import { LEAGUE_AVERAGE_OPPONENT } from "@/sim/baseline";
import { simulateSeason } from "@/sim/season";
import { BoxScores } from "./BoxScores";
import { DraftScreen } from "./DraftScreen";
import { ResultScreen } from "./ResultScreen";
import { SimulateScreen } from "./SimulateScreen";
import { SpinAnimation } from "./SpinAnimation";

type Phase = "spinning" | "draft" | "simulate" | "result" | "boxscores";
type Rerolls = { team: number; era: number };

const randomSeed = () => Math.floor(Math.random() * 0xffffffff) >>> 0;

export function RunContainer() {
  const [index, setIndex] = useState<TeamsIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [rerollsUsed, setRerollsUsed] = useState<Rerolls>({ team: 0, era: 0 });
  const [seed, setSeed] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("spinning");

  const [cell, setCell] = useState<SpinCell | null>(null);
  const [chunk, setChunk] = useState<TeamDecadeChunk | null>(null);
  const [chunkLoading, setChunkLoading] = useState(false);
  const [spinSeq, setSpinSeq] = useState(0);

  // Begin a spin onto `target`: replay the reel animation while the chunk loads.
  const spinTo = useCallback((target: SpinCell) => {
    setCell(target);
    setChunk(null);
    setChunkLoading(true);
    loadChunk(target.chunk)
      .then(setChunk)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setChunkLoading(false));
    setSpinSeq((s) => s + 1);
    setPhase("spinning");
  }, []);

  useEffect(() => {
    loadTeamsIndex()
      .then((idx) => {
        setIndex(idx);
        const saved = loadRun();
        const startPicks = saved?.picks ?? [];
        if (saved) {
          setPicks(startPicks);
          setRerollsUsed(saved.rerollsUsed);
          if (saved.seed != null) setSeed(saved.seed);
        }
        if (isComplete(startPicks)) setPhase("result");
        else spinTo(randomCell(idx, Math.random));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [spinTo]);

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

  const persist = (next: DraftPick[], rr: Rerolls, s: number | null) =>
    saveRun({ picks: next, rerollsUsed: rr, ...(s != null ? { seed: s } : {}) });

  const commit = (next: DraftPick[]) => {
    setPicks(next);
    if (isComplete(next)) {
      const s = seed ?? randomSeed();
      setSeed(s);
      persist(next, rerollsUsed, s);
      setPhase("simulate");
    } else {
      persist(next, rerollsUsed, seed);
      if (index) spinTo(randomCell(index, Math.random));
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

  const consumeAndSpin = (kind: "team" | "era", next: SpinCell) => {
    const rr = { ...rerollsUsed, [kind]: rerollsUsed[kind] + 1 };
    setRerollsUsed(rr);
    persist(picks, rr, seed);
    spinTo(next);
  };
  const onRerollTeam = () => {
    if (!index || !cell || rerollsUsed.team > 0 || !canRerollTeam(index, cell)) return;
    consumeAndSpin("team", rerollTeam(index, cell, Math.random));
  };
  const onRerollEra = () => {
    if (!index || !cell || rerollsUsed.era > 0 || !canRerollEra(index, cell)) return;
    consumeAndSpin("era", rerollEra(index, cell, Math.random));
  };
  const onRespin = () => {
    if (index) spinTo(randomCell(index, Math.random)); // free escape — no re-roll consumed
  };

  const startOver = () => {
    clearRun();
    setPicks([]);
    setRerollsUsed({ team: 0, era: 0 });
    setSeed(null);
    if (index) spinTo(randomCell(index, Math.random));
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

  if (phase === "simulate" || phase === "result" || phase === "boxscores") {
    if (!result) return <p className="mx-auto px-6 pt-16 text-center font-mono text-sm text-ink-faint">Simulating…</p>;
    if (phase === "simulate") return <SimulateScreen result={result} onDone={() => setPhase("result")} />;
    if (phase === "boxscores") return <BoxScores result={result} picks={picks} onBack={() => setPhase("result")} />;
    return (
      <ResultScreen result={result} picks={picks} onReplay={startOver} onViewBoxScores={() => setPhase("boxscores")} />
    );
  }

  if (phase === "spinning") {
    if (!cell) return <p className="mx-auto px-6 pt-16 text-center font-mono text-sm text-ink-faint">Loading…</p>;
    return <SpinAnimation key={spinSeq} index={index} target={cell} round={round} onDone={() => setPhase("draft")} />;
  }

  if (chunkLoading || !chunk) {
    return <p className="mx-auto px-6 pt-16 text-center font-mono text-sm text-ink-faint">Loading roster…</p>;
  }
  return (
    <DraftScreen
      chunk={chunk}
      picks={picks}
      round={round}
      rerollsUsed={rerollsUsed}
      canRerollTeam={cell ? canRerollTeam(index, cell) : false}
      canRerollEra={cell ? canRerollEra(index, cell) : false}
      onRerollTeam={onRerollTeam}
      onRerollEra={onRerollEra}
      onRespin={onRespin}
      onPickHitter={onPickHitter}
      onPickPitcher={onPickPitcher}
    />
  );
}
