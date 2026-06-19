"use client";

import { useState } from "react";
import Link from "next/link";

import { buildSubmission, leaderboardEnabled, loadInitials, saveInitials, submitScore, validateInitials } from "@/lib/leaderboard";
import type { DraftPick } from "@/lib/types";
import type { SeasonResult } from "@/sim/types";

/** Arcade 3-initials entry on the daily result (D-012). Renders nothing until the
 * leaderboard endpoint is configured. The roster (ids only) rides along so the Worker
 * can re-verify high claims. */
export function DailySubmit({ dateKey, result, picks }: { dateKey: string; result: SeasonResult; picks: DraftPick[] }) {
  if (!leaderboardEnabled()) return null;
  return <Inner dateKey={dateKey} result={result} picks={picks} />;
}

function Inner({ dateKey, result, picks }: { dateKey: string; result: SeasonResult; picks: DraftPick[] }) {
  const [initials, setInitials] = useState(loadInitials());
  const [status, setStatus] = useState<"idle" | "sending" | "posted" | "error" | "invalid">("idle");

  const submit = async () => {
    const valid = validateInitials(initials);
    if (!valid) {
      setStatus("invalid");
      return;
    }
    saveInitials(valid);
    setStatus("sending");
    setStatus((await submitScore(buildSubmission(dateKey, valid, result, picks))) === "ok" ? "posted" : "error");
  };

  return (
    <div className="mt-6 rounded-lg border border-gold/60 bg-paper-dark/40 p-3 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-vintage">Post to today&rsquo;s leaderboard</p>
      {status === "posted" ? (
        <p className="mt-2 font-mono text-sm text-navy">
          Posted as {validateInitials(initials)} —{" "}
          <Link href="/leaderboard" className="underline underline-offset-4 hover:text-ink">view board →</Link>
        </p>
      ) : (
        <>
          <div className="mt-2 flex items-center justify-center gap-2">
            <input
              value={initials}
              onChange={(e) => {
                setInitials(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3));
                if (status !== "idle") setStatus("idle");
              }}
              placeholder="AAA"
              maxLength={3}
              aria-label="Your initials"
              className="w-20 rounded-md border-2 border-faded bg-paper px-3 py-2 text-center font-mono text-lg uppercase tracking-[0.3em] text-ink focus:border-gold focus:outline-none"
            />
            <button
              onClick={submit}
              disabled={status === "sending"}
              className="rounded-lg bg-vintage px-5 py-2 font-mono text-xs uppercase tracking-widest text-paper transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {status === "sending" ? "Posting…" : "Post score"}
            </button>
          </div>
          {status === "invalid" && <p className="mt-2 font-mono text-xs text-vintage">Enter three letters.</p>}
          {status === "error" && <p className="mt-2 font-mono text-xs text-vintage">Couldn&rsquo;t post — try again.</p>}
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            <Link href="/leaderboard" className="underline underline-offset-2 hover:text-ink">view leaderboard →</Link>
          </p>
        </>
      )}
    </div>
  );
}
