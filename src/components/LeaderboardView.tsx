"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { dailyDateKey, dailyNumber } from "@/lib/daily";
import { dailyThemeName } from "@/lib/divisions";
import { type BoardRow, type BoardScope, fetchBoard, leaderboardEnabled } from "@/lib/leaderboard";

const TABS: { key: BoardScope; label: string }[] = [
  { key: "daily", label: "Today" },
  { key: "weekly", label: "This week" },
  { key: "alltime", label: "All-time" },
];

/** The leaderboard page body (D-012). Fetches the chosen board from the Worker; renders
 * loading/empty/error states. The page route itself always exists; entry links are gated. */
export function LeaderboardView() {
  const [scope, setScope] = useState<BoardScope>("daily");
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [error, setError] = useState(false);
  const enabled = leaderboardEnabled();
  const today = dailyDateKey(new Date());

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setRows(null);
    setError(false);
    fetchBoard(scope, scope === "daily" ? today : undefined)
      .then((r) => live && setRows(r))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [scope, enabled, today]);

  return (
    <div className="mx-auto max-w-md px-4 pt-10 pb-16">
      <p className="text-center font-mono text-xs uppercase tracking-[0.3em] text-ink-faint">Ghost Roster</p>
      <h1 className="mt-2 text-center font-display text-4xl text-ink">Leaderboard</h1>
      <p className="mt-1 text-center font-mono text-[11px] uppercase tracking-wider text-vintage">
        Daily #{dailyNumber(today)} · {dailyThemeName(today)}
      </p>
      <div className="mx-auto my-5 h-px w-24 bg-ink" />

      {!enabled ? (
        <p className="text-center font-mono text-sm text-ink-faint">The leaderboard isn&rsquo;t live yet.</p>
      ) : (
        <>
          <div className="mb-4 flex justify-center gap-5 font-mono text-[11px] uppercase tracking-wider">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setScope(t.key)}
                className={`pb-1 ${scope === t.key ? "border-b-2 border-gold text-ink" : "text-ink-faint hover:text-ink"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error ? (
            <p className="text-center font-mono text-xs text-vintage">Couldn&rsquo;t load the board.</p>
          ) : rows === null ? (
            <p className="text-center font-mono text-xs text-ink-faint">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-center font-mono text-xs text-ink-faint">No scores yet — be the first.</p>
          ) : (
            <table className="w-full font-mono text-sm">
              <thead>
                <tr className="border-b border-faded text-[10px] uppercase tracking-wider text-ink-faint">
                  <th className="py-1 text-left font-normal">#</th>
                  <th className="py-1 text-left font-normal">Init</th>
                  <th className="py-1 text-right font-normal">Record</th>
                  <th className="py-1 text-right font-normal">{scope === "alltime" ? "162-0" : "Grade"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.rank}-${r.initials}-${r.dateKey ?? ""}`} className="border-b border-faded/30">
                    <td className="py-1.5 tabular-nums text-ink-faint">{r.rank}</td>
                    <td className="py-1.5 tracking-[0.2em] text-ink">{r.initials}</td>
                    <td className="py-1.5 text-right tabular-nums text-vintage">{r.wins}–{r.losses}</td>
                    <td className="py-1.5 text-right tabular-nums text-gold-ink">
                      {scope === "alltime" ? (r.perfectCount ?? 0) : r.grade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <div className="mt-10 flex flex-col items-center gap-3">
        <Link
          href="/daily"
          className="rounded-lg bg-vintage px-8 py-3 font-mono text-sm uppercase tracking-[0.2em] text-paper transition-transform hover:scale-[1.02] active:scale-95"
        >
          Play today&rsquo;s daily
        </Link>
        <Link href="/" className="font-mono text-xs uppercase tracking-widest text-navy underline underline-offset-4">
          Home
        </Link>
      </div>
    </div>
  );
}
