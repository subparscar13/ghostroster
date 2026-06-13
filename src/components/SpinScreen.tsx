"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { canRerollEra, randomCell, rerollEra, rerollTeam } from "@/lib/spin";
import type { SpinCell, TeamsIndex } from "@/lib/types";

type Props = {
  index: TeamsIndex;
  round: number;
  rerollsUsed: { team: number; era: number };
  onConsumeReroll: (type: "team" | "era") => void;
  onConfirm: (cell: SpinCell) => void;
};

type Stage = "idle" | "rolling" | "revealed";

const ROLL_MS = 850;
const FLICKER_MS = 70;

/** The slot-machine spin screen (T041): roll the franchise + decade reels, reveal a
 * cell, offer the two per-run re-rolls, then confirm into the draft. */
export function SpinScreen({ index, round, rerollsUsed, onConsumeReroll, onConfirm }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [cell, setCell] = useState<SpinCell | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const landOn = useCallback(
    (target: SpinCell) => {
      const reduce =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        setCell(target);
        setStage("revealed");
        return;
      }
      setStage("rolling");
      const start = performance.now();
      const tick = () => {
        if (performance.now() - start >= ROLL_MS) {
          setCell(target);
          setStage("revealed");
          return;
        }
        setCell(randomCell(index, Math.random));
        timer.current = setTimeout(tick, FLICKER_MS);
      };
      tick();
    },
    [index],
  );

  const spin = () => landOn(randomCell(index, Math.random));
  const doRerollTeam = () => {
    if (!cell || rerollsUsed.team > 0) return;
    onConsumeReroll("team");
    landOn(rerollTeam(index, cell, Math.random));
  };
  const doRerollEra = () => {
    if (!cell || rerollsUsed.era > 0) return;
    onConsumeReroll("era");
    landOn(rerollEra(index, cell, Math.random));
  };

  const rolling = stage === "rolling";
  const revealed = stage === "revealed" && cell !== null;
  const eraAvailable = rerollsUsed.era === 0 && cell !== null && canRerollEra(index, cell);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 pt-12 pb-8 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">
        Round {round} of 13
      </p>
      <div className="mb-6 mt-2 h-px w-20 bg-ink" />

      <div className="w-full space-y-3">
        <Reel label="Franchise" value={cell ? cell.franchise : "—"} dim={!revealed && !rolling} />
        <Reel label="Decade" value={cell ? `${cell.decade}s` : "—"} dim={!revealed && !rolling} mono />
      </div>

      <div className="mt-3 h-5 font-mono text-xs text-ink-faint" aria-live="polite">
        {revealed && cell
          ? `${cell.counts.hitters} hitters · ${cell.counts.sp} SP · ${cell.counts.rp} RP`
          : ""}
      </div>

      {stage === "idle" && (
        <button
          onClick={spin}
          className="mt-6 rounded-lg bg-vintage px-12 py-3 font-mono text-sm uppercase tracking-[0.2em] text-paper transition-transform hover:scale-[1.02] active:scale-95"
        >
          Spin
        </button>
      )}

      {rolling && (
        <p className="mt-8 font-mono text-sm uppercase tracking-[0.2em] text-ink-faint">Spinning…</p>
      )}

      {revealed && cell && (
        <div className="mt-6 flex w-full flex-col items-center gap-4">
          <div className="flex w-full gap-2">
            <RerollChip label="Team re-roll" used={rerollsUsed.team > 0} onClick={doRerollTeam} />
            <RerollChip label="Era re-roll" used={rerollsUsed.era > 0} disabled={!eraAvailable} onClick={doRerollEra} />
          </div>
          <button
            onClick={() => onConfirm(cell)}
            className="w-full rounded-lg bg-navy px-8 py-3 font-mono text-sm uppercase tracking-[0.2em] text-paper transition-transform hover:scale-[1.02] active:scale-95"
          >
            Draft from here →
          </button>
        </div>
      )}
    </div>
  );
}

function Reel({ label, value, dim, mono }: { label: string; value: string; dim?: boolean; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-ink px-4 py-3 text-left">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">{label}</div>
      <div
        className={`mt-1 truncate ${mono ? "font-mono" : "font-display"} text-2xl uppercase tracking-wide ${dim ? "text-ink-faint/60" : "text-paper"}`}
      >
        {value}
      </div>
    </div>
  );
}

function RerollChip({
  label,
  used,
  disabled,
  onClick,
}: {
  label: string;
  used: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const spent = used || disabled;
  return (
    <button
      onClick={onClick}
      disabled={spent}
      className={`flex-1 rounded-md border px-2 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${
        spent
          ? "cursor-not-allowed border-faded/50 text-ink-faint/50 line-through"
          : "border-gold text-gold-ink hover:bg-gold/10"
      }`}
    >
      {label} · {used ? 0 : 1}
    </button>
  );
}
