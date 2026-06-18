"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { loadChunk, loadTeamsIndex } from "@/lib/data";
import { dailyDateKey, dailyNumber, dailyRng, dailySeed, dailyShareText, spoilerSquares } from "@/lib/daily";
import { dailyThemeName, eligibleCells } from "@/lib/divisions";
import { buildSimRoster, draftHitter, draftPitcher, isComplete } from "@/lib/draft";
import { canRerollEra, canRerollTeam, randomCell, rerollEra, rerollTeam, REROLLS_PER_RUN } from "@/lib/spin";
import { clearRun, loadRun, saveDailyResult, saveRun } from "@/lib/storage";
import type { RunMode } from "@/lib/storage";
import type { DraftPick, PoolHitter, PoolPitcher, Slot, SpinCell, TeamDecadeChunk, TeamsIndex } from "@/lib/types";
import { LEAGUE_AVERAGE_OPPONENT } from "@/sim/baseline";
import type { Rng } from "@/sim/rng";
import { simulateSeason } from "@/sim/season";
import { BoxScores } from "./BoxScores";
import { DraftScreen } from "./DraftScreen";
import { ResultScreen } from "./ResultScreen";
import { SimulateScreen } from "./SimulateScreen";
import { SpinAnimation } from "./SpinAnimation";

type Phase = "spinning" | "draft" | "simulate" | "result" | "boxscores";
type Rerolls = { team: number; era: number };

const randomSeed = () => Math.floor(Math.random() * 0xffffffff) >>> 0;

export function RunContainer({ mode = "classic" }: { mode?: RunMode }) {
  const [index, setIndex] = useState<TeamsIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [rerollsUsed, setRerollsUsed] = useState<Rerolls>({ team: 0, era: 0 });
  const [seed, setSeed] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("spinning");
  const [dateKey, setDateKey] = useState("");
  const [respins, setRespins] = useState(0);
  const [boxGame, setBoxGame] = useState<number | null>(null); // deep-link target for box scores

  const [cell, setCell] = useState<SpinCell | null>(null);
  const [chunk, setChunk] = useState<TeamDecadeChunk | null>(null);
  const [chunkLoading, setChunkLoading] = useState(false);
  const [spinSeq, setSpinSeq] = useState(0);

  // Classic spins use Math.random; daily spins are deterministic per (date, event key).
  const rngForKey = useCallback(
    (dk: string, key: string): Rng => (mode === "daily" && dk ? dailyRng(dk, key) : Math.random),
    [mode],
  );

  // The spinnable pool: the full index for classic, the day's division/All-Star subset
  // for the daily (D-015). Re-rolls and respins all draw from this.
  const pool = useMemo<SpinCell[]>(
    () => (!index ? [] : mode === "daily" && dateKey ? eligibleCells(index.cells, dateKey) : index.cells),
    [index, mode, dateKey],
  );

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
        const dk = mode === "daily" ? dailyDateKey(new Date()) : "";
        setDateKey(dk);
        const saved = loadRun(mode);
        const startPicks = saved?.picks ?? [];
        if (saved) {
          setPicks(startPicks);
          setRerollsUsed(saved.rerollsUsed);
        }
        setSeed(mode === "daily" ? dailySeed(dk) : (saved?.seed ?? null));
        const cells0 = mode === "daily" && dk ? eligibleCells(idx.cells, dk) : idx.cells;
        if (isComplete(startPicks)) setPhase("result");
        else spinTo(randomCell(cells0, rngForKey(dk, `spin:${startPicks.length + 1}`)));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [mode, spinTo, rngForKey]);

  const result = useMemo(() => {
    if (!isComplete(picks) || seed == null) return null;
    try {
      return simulateSeason(buildSimRoster(picks), LEAGUE_AVERAGE_OPPONENT, seed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [picks, seed]);

  // Persist the daily result (replay allowed — this is history, not a lock).
  useEffect(() => {
    if (mode === "daily" && dateKey && result && isComplete(picks)) {
      saveDailyResult(dateKey, {
        record: `${result.record.w}-${result.record.l}`,
        grade: result.grade,
        squares: spoilerSquares(result),
        playedAt: new Date().toISOString(),
      });
    }
  }, [mode, dateKey, result, picks]);

  const round = picks.length + 1;
  const persist = (next: DraftPick[], rr: Rerolls, s: number | null) =>
    saveRun(mode, { picks: next, rerollsUsed: rr, ...(s != null ? { seed: s } : {}) });

  const commit = (next: DraftPick[]) => {
    setPicks(next);
    setRespins(0);
    if (isComplete(next)) {
      const s = seed ?? randomSeed();
      setSeed(s);
      persist(next, rerollsUsed, s);
      setPhase("simulate");
    } else {
      persist(next, rerollsUsed, seed);
      if (pool.length) spinTo(randomCell(pool, rngForKey(dateKey, `spin:${next.length + 1}`)));
    }
  };

  const onPickHitter = (h: PoolHitter, tag: string, slot?: Slot) => {
    const next = draftHitter(h, tag, picks, slot);
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
    if (!cell || rerollsUsed.team >= REROLLS_PER_RUN || !canRerollTeam(pool, cell)) return;
    // Index the daily key per re-roll so the two re-rolls are distinct + reproducible.
    consumeAndSpin("team", rerollTeam(pool, cell, rngForKey(dateKey, `team:${round}:${rerollsUsed.team + 1}`)));
  };
  const onRerollEra = () => {
    if (!cell || rerollsUsed.era >= REROLLS_PER_RUN || !canRerollEra(pool, cell)) return;
    consumeAndSpin("era", rerollEra(pool, cell, rngForKey(dateKey, `era:${round}:${rerollsUsed.era + 1}`)));
  };
  const onRespin = () => {
    if (!pool.length) return;
    spinTo(randomCell(pool, rngForKey(dateKey, `respin:${round}:${respins}`)));
    setRespins((r) => r + 1);
  };

  const startOver = () => {
    clearRun(mode);
    setPicks([]);
    setRerollsUsed({ team: 0, era: 0 });
    setRespins(0);
    setSeed(mode === "daily" ? dailySeed(dateKey) : null);
    if (pool.length) spinTo(randomCell(pool, rngForKey(dateKey, `spin:1`)));
  };

  const view = renderView();
  return (
    <>
      {mode === "daily" && dateKey && (
        <p className="pt-4 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-vintage">
          Daily #{dailyNumber(dateKey)} · {dailyThemeName(dateKey)}
        </p>
      )}
      {view}
    </>
  );

  function renderView() {
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
    if (!index) return <p className="mx-auto px-6 pt-16 text-center font-mono text-sm text-ink-faint">Loading…</p>;

    if (phase === "simulate" || phase === "result" || phase === "boxscores") {
      if (!result) return <p className="mx-auto px-6 pt-16 text-center font-mono text-sm text-ink-faint">Simulating…</p>;
      if (phase === "simulate") return <SimulateScreen result={result} onDone={() => setPhase("result")} />;
      if (phase === "boxscores")
        return <BoxScores result={result} picks={picks} initialGame={boxGame} onBack={() => setPhase("result")} />;
      return (
        <ResultScreen
          result={result}
          picks={picks}
          onReplay={startOver}
          onViewBoxScores={(game) => {
            setBoxGame(game ?? null);
            setPhase("boxscores");
          }}
          {...(mode === "daily" && dateKey ? { dailyShareText: dailyShareText(dateKey, result) } : {})}
        />
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
        canRerollTeam={cell ? canRerollTeam(pool, cell) : false}
        canRerollEra={cell ? canRerollEra(pool, cell) : false}
        onRerollTeam={onRerollTeam}
        onRerollEra={onRerollEra}
        onRespin={onRespin}
        onPickHitter={onPickHitter}
        onPickPitcher={onPickPitcher}
      />
    );
  }
}
