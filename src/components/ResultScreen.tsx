"use client";

import { useState } from "react";
import Link from "next/link";

import { shareDaily } from "@/lib/daily";
import { quip, seasonStats, topPerformerName } from "@/lib/result";
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
  dailyShareText,
}: {
  result: SeasonResult;
  picks: DraftPick[];
  onReplay: () => void;
  onViewBoxScores: (game?: number) => void;
  dailyShareText?: string;
}) {
  const { w, l } = result.record;
  const stats = seasonStats(result);
  const quote = quip(result, picks);
  const [preview, setPreview] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const isDaily = dailyShareText != null;

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

      <div className="my-6 text-left">
        <p className="mb-2 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-vintage">Season stats</p>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Run diff" value={`${stats.runDiff >= 0 ? "+" : ""}${stats.runDiff}`} />
          <Stat label="Runs for" value={stats.runsFor} />
          <Stat label="Runs against" value={stats.runsAgainst} />
          <Stat label="Team avg" value={stats.teamAvg} />
          <Stat label="Home runs" value={stats.teamHR} />
          <Stat label="Shutouts" value={stats.shutouts} />
          <Stat label="No-hitters" value={stats.noHitters} />
          <Stat label="Long. streak" value={stats.longestWinStreak} />
          <Stat label="Biggest win" value={stats.biggestWin} onClick={() => onViewBoxScores(result.highlights.bestGame)} />
          <Stat label="Worst loss" value={stats.worstLoss} onClick={() => onViewBoxScores(result.highlights.worstGame)} />
        </div>
        <p className="mt-2 text-center font-mono text-xs text-ink-soft">
          Top performer: <span className="text-ink">{topPerformerName(result, picks)}</span>
        </p>
      </div>

      <figure className="mx-auto mt-4 max-w-xs">
        <p className="text-balance font-display text-lg italic text-ink">&ldquo;{quote.quote}&rdquo;</p>
        <figcaption className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">— {quote.author}</figcaption>
      </figure>

      <div className="mt-8 flex flex-col items-center gap-3">
        {isDaily ? (
          <button
            onClick={async () => {
              const r = await shareDaily(dailyShareText);
              setShareStatus(r === "copied" ? "Copied to clipboard" : r === "shared" ? "Shared" : "Couldn't share");
            }}
            className="rounded-lg border-2 border-gold px-10 py-3 font-mono text-sm uppercase tracking-[0.2em] text-gold-ink transition-transform hover:scale-[1.02] active:scale-95"
          >
            Share result
          </button>
        ) : (
          <button
            onClick={() => setPreview(renderResultCard(result, picks).toDataURL("image/png"))}
            className="rounded-lg border-2 border-gold px-10 py-3 font-mono text-sm uppercase tracking-[0.2em] text-gold-ink transition-transform hover:scale-[1.02] active:scale-95"
          >
            Share
          </button>
        )}
        <button
          onClick={() => onViewBoxScores()}
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

      {isDaily && (
        <div className="mt-6 rounded-lg border border-faded/60 bg-paper-dark/40 p-3">
          <pre className="whitespace-pre-wrap text-center font-mono text-sm leading-relaxed text-ink">{dailyShareText}</pre>
          <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-wider text-ink-faint">spoiler-safe · no roster</p>
          {shareStatus && <p className="mt-2 text-center font-mono text-xs text-navy">{shareStatus}</p>}
        </div>
      )}

      {!isDaily && preview && (
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

function Stat({ label, value, onClick }: { label: string; value: string | number; onClick?: () => void }) {
  const body = (
    <>
      <div className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">{label}</div>
      <div className="font-mono text-base tabular-nums text-ink">{value}</div>
    </>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className="rounded-md bg-paper-dark/40 px-2 py-1.5 text-left ring-1 ring-navy/30 transition-colors hover:bg-gold/15">
        {body}
        <div className="font-mono text-[8px] uppercase tracking-wider text-navy">view →</div>
      </button>
    );
  }
  return <div className="rounded-md bg-paper-dark/40 px-2 py-1.5">{body}</div>;
}
