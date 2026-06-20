"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  type BoardMode,
  buildSubmission,
  hasSubmitted,
  leaderboardEnabled,
  loadInitials,
  markSubmitted,
  saveInitials,
  submitScore,
  submittedKey,
  validateName,
} from "@/lib/leaderboard";
import type { DraftPick } from "@/lib/types";
import type { SeasonResult } from "@/sim/types";

/** Arcade name entry on the result screen (D-012). Now an *active* prompt: it sits as a
 * prominent element under the record and, when a name is remembered, posts in one tap.
 * Works for both boards (daily + classic). Renders nothing until the leaderboard endpoint
 * is configured. The roster (ids only) + the classic seed ride along so the Worker can
 * re-verify high claims. Once a run is posted, the prompt stays a confirmation on replays. */
export function ScoreSubmit({ mode, dateKey, result, picks, seed, reloads }: { mode: BoardMode; dateKey: string; result: SeasonResult; picks: DraftPick[]; seed?: number; reloads?: number }) {
  if (!leaderboardEnabled()) return null;
  return <Inner mode={mode} dateKey={dateKey} result={result} picks={picks} {...(seed != null ? { seed } : {})} {...(reloads ? { reloads } : {})} />;
}

function Inner({ mode, dateKey, result, picks, seed, reloads }: { mode: BoardMode; dateKey: string; result: SeasonResult; picks: DraftPick[]; seed?: number; reloads?: number }) {
  const key = submittedKey(mode, dateKey, seed);
  const remembered = loadInitials();
  const [initials, setInitials] = useState(remembered);
  const [status, setStatus] = useState<"idle" | "sending" | "posted" | "error" | "invalid">(() => (hasSubmitted(key) ? "posted" : "idle"));
  // Returning players (a remembered name) get a one-tap button; first-timers get the input.
  const [showInput, setShowInput] = useState(() => validateName(remembered) == null);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { w, l } = result.record;
  const label = mode === "daily" ? "today’s leaderboard" : "the all-time board";

  // One-time gentle entrance so the prompt draws the eye without a loud animation.
  useEffect(() => setMounted(true), []);
  // Focus the field only when the input is the thing being shown (never steals focus / pops
  // the mobile keyboard on the common one-tap path).
  useEffect(() => {
    if (showInput && status !== "posted") inputRef.current?.focus();
  }, [showInput, status]);

  const submit = async (name: string) => {
    const valid = validateName(name);
    if (!valid) {
      setShowInput(true);
      setStatus("invalid");
      return;
    }
    saveInitials(valid);
    setStatus("sending");
    const r = await submitScore(buildSubmission(mode, dateKey, valid, result, picks, seed, reloads));
    if (r === "ok") {
      markSubmitted(key);
      setStatus("posted");
    } else {
      setStatus("error");
    }
  };

  return (
    <div
      className={`mt-6 rounded-lg border-2 border-gold bg-paper-dark/50 p-4 text-center shadow-sm transition-all duration-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold-ink">Post your {w}&ndash;{l} to {label}</p>

      {status === "posted" ? (
        <p className="mt-2 font-mono text-sm text-navy">
          Posted as {validateName(initials)} —{" "}
          <Link href="/leaderboard" className="underline underline-offset-4 hover:text-ink">view board →</Link>
        </p>
      ) : !showInput && validateName(initials) ? (
        <>
          <button
            onClick={() => void submit(initials)}
            disabled={status === "sending"}
            className="mt-3 rounded-lg bg-vintage px-8 py-3 font-mono text-sm uppercase tracking-[0.2em] text-paper transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {status === "sending" ? "Posting…" : `Post as ${validateName(initials)}`}
          </button>
          {status === "error" && <p className="mt-2 font-mono text-xs text-vintage">Couldn&rsquo;t post — try again.</p>}
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            <button onClick={() => setShowInput(true)} className="underline underline-offset-2 hover:text-ink">use a different name</button>
            <span aria-hidden> · </span>
            <Link href="/leaderboard" className="underline underline-offset-2 hover:text-ink">view board →</Link>
          </p>
        </>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-center gap-2">
            <input
              ref={inputRef}
              value={initials}
              onChange={(e) => {
                setInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
                if (status !== "idle") setStatus("idle");
              }}
              placeholder="NAME"
              maxLength={10}
              aria-label="Your name"
              className="w-44 rounded-md border-2 border-faded bg-paper px-3 py-2 text-center font-mono text-base uppercase tracking-[0.15em] text-ink focus:border-gold focus:outline-none"
            />
            <button
              onClick={() => void submit(initials)}
              disabled={status === "sending"}
              className="rounded-lg bg-vintage px-5 py-2 font-mono text-xs uppercase tracking-widest text-paper transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {status === "sending" ? "Posting…" : "Post score"}
            </button>
          </div>
          {status === "invalid" && <p className="mt-2 font-mono text-xs text-vintage">Enter 1–10 letters or numbers.</p>}
          {status === "error" && <p className="mt-2 font-mono text-xs text-vintage">Couldn&rsquo;t post — try again.</p>}
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            <Link href="/leaderboard" className="underline underline-offset-2 hover:text-ink">view leaderboard →</Link>
          </p>
        </>
      )}
    </div>
  );
}
