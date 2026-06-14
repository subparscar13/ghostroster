"use client";

import { useState } from "react";
import Link from "next/link";

import { primaryHighlight, quip, topPerformerName } from "@/lib/result";
import { renderResultCard, shareResultImage } from "@/lib/share";
import type { DraftPick } from "@/lib/types";
import type { SeasonResult } from "@/sim/types";
import { RosterSidebar } from "./RosterSidebar";

/** Result screen (T045): record + letter grade + the 13-man roster card with era
 * tags + one highlight beat + one generated quip. Screenshot/share is M4 (T051). */
export function ResultScreen({
  result,
  picks,
  onReplay,
  onViewBoxScores,
}: {
  result: SeasonResult;
  picks: DraftPick[];
  onReplay: () => void;
  onViewBoxScores: () => void;
}) {
  const { w, l } = result.record;
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-md px-4 pt-10 pb-10 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">Final record</p>
      <div className="mt-1 font-mono text-6xl leading-none text-vintage">
        {w}&ndash;{l}
      </div>
      <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold font-display text-2xl text-gold-ink">
        {result.grade}
      </div>

      <div className="my-6 rounded-lg border border-faded/60 bg-paper-dark/40 p-3">
        <RosterSidebar picks={picks} />
      </div>

      <div className="space-y-1 font-mono text-sm text-ink-soft">
        <p>
          <span className="text-navy">&#9733;</span> {primaryHighlight(result)}
        </p>
        <p>Top performer: {topPerformerName(result, picks)}</p>
      </div>

      <p className="mx-auto mt-4 max-w-xs text-balance font-display text-lg italic text-ink">
        &ldquo;{quip(result)}&rdquo;
      </p>

      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          onClick={() => setPreview(renderResultCard(result, picks).toDataURL("image/png"))}
          className="rounded-lg border-2 border-gold px-10 py-3 font-mono text-sm uppercase tracking-[0.2em] text-gold-ink transition-transform hover:scale-[1.02] active:scale-95"
        >
          Share
        </button>
        <button
          onClick={onViewBoxScores}
          className="rounded-lg bg-navy px-10 py-3 font-mono text-sm uppercase tracking-[0.2em] text-paper transition-transform hover:scale-[1.02] active:scale-95"
        >
          Box scores
        </button>
        <button
          onClick={onReplay}
          className="rounded-lg bg-vintage px-10 py-3 font-mono text-sm uppercase tracking-[0.2em] text-paper transition-transform hover:scale-[1.02] active:scale-95"
        >
          New run
        </button>
        <Link href="/" className="font-mono text-xs uppercase tracking-widest text-navy underline underline-offset-4">
          Home
        </Link>
      </div>

      {preview && (
        <div className="mt-6 rounded-lg border border-faded/60 bg-paper-dark/40 p-3">
          <img src={preview} alt="Shareable result card" className="mx-auto w-full max-w-xs rounded-md border border-ink/20" />
          <div className="mt-3 flex justify-center gap-3">
            <button
              onClick={() => void shareResultImage(result, picks)}
              className="rounded-lg bg-vintage px-6 py-2 font-mono text-xs uppercase tracking-widest text-paper"
            >
              Save / share
            </button>
            <button
              onClick={() => setPreview(null)}
              className="font-mono text-xs uppercase tracking-widest text-navy underline underline-offset-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
