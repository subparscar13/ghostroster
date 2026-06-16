"use client";

import { useMemo, useState } from "react";

import { playerSeasonStats } from "@/lib/result";
import type { DraftPick } from "@/lib/types";
import type { GameLog, SeasonResult } from "@/sim/types";

/** Box scores (T050): browse the 162-game season log, tap any game for its line
 * score + your batting lines. Opponent is the era-average league ("League Avg"). */
export function BoxScores({
  result,
  picks,
  onBack,
  initialGame = null,
}: {
  result: SeasonResult;
  picks: DraftPick[];
  onBack: () => void;
  initialGame?: number | null;
}) {
  const [selected, setSelected] = useState<number | null>(initialGame);
  const [view, setView] = useState<"log" | "stats">("log");
  const nameById = useMemo(() => new Map(picks.map((p) => [p.playerId, p.name])), [picks]);
  const stats = useMemo(() => playerSeasonStats(result, picks), [result, picks]);
  const game = selected != null ? result.gameLogs[selected - 1] : null;

  return (
    <div className="mx-auto max-w-md px-4 pt-8 pb-10">
      <div className="flex items-center justify-between">
        <button onClick={selected ? () => setSelected(null) : onBack} className="font-mono text-xs uppercase tracking-widest text-navy underline underline-offset-4">
          ← {selected ? "season" : "result"}
        </button>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
          {result.record.w}–{result.record.l}
        </p>
      </div>

      {game ? (
        <GameDetail game={game} nameById={nameById} />
      ) : (
        <>
          <div className="mt-3 flex justify-center gap-5 font-mono text-[11px] uppercase tracking-wider">
            <Tab active={view === "log"} onClick={() => setView("log")}>Season log</Tab>
            <Tab active={view === "stats"} onClick={() => setView("stats")}>Season stats</Tab>
          </div>

          {view === "log" ? (
            <div className="mt-4 divide-y divide-faded/40 rounded-lg border border-faded/50">
              {result.gameLogs.map((g) => (
                <button
                  key={g.game}
                  onClick={() => setSelected(g.game)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left font-mono text-xs hover:bg-gold/10"
                >
                  <span className="text-ink-faint">Game {g.game}</span>
                  <span className="flex items-center gap-3">
                    <span className={g.win ? "text-navy" : "text-vintage"}>{g.win ? "W" : "L"}</span>
                    <span className="tabular-nums text-ink">
                      {g.home.runs}–{g.away.runs}
                    </span>
                    {g.away.hits === 0 && <span className="text-gold-ink">no-no</span>}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <SeasonStats stats={stats} />
          )}
        </>
      )}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`pb-1 ${active ? "border-b-2 border-gold text-ink" : "text-ink-faint hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

/** Format a rate stat baseball-style: 3 decimals, leading zero dropped under 1.000. */
function rate(x: number): string {
  const s = x.toFixed(3);
  return x < 1 ? s.replace(/^0/, "") : s;
}

function SeasonStats({ stats }: { stats: ReturnType<typeof playerSeasonStats> }) {
  return (
    <div className="mt-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-vintage">Hitters</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-max font-mono text-[11px]">
          <thead>
            <tr className="border-b border-faded text-ink-faint">
              <th className="py-1 pr-2 text-left font-normal">Batter</th>
              {["AB", "R", "H", "2B", "3B", "HR", "RBI", "BB", "AVG", "OBP", "SLG", "OPS"].map((c) => (
                <th key={c} className="px-1.5 font-normal">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.hitters.map((h) => (
              <tr key={h.playerId} className="border-b border-faded/30">
                <td className="py-1 pr-2 font-display text-sm">{h.name}</td>
                <td className="px-1.5 text-center tabular-nums">{h.ab}</td>
                <td className="px-1.5 text-center tabular-nums">{h.r}</td>
                <td className="px-1.5 text-center tabular-nums">{h.h}</td>
                <td className="px-1.5 text-center tabular-nums">{h.b2}</td>
                <td className="px-1.5 text-center tabular-nums">{h.b3}</td>
                <td className="px-1.5 text-center tabular-nums text-ink">{h.hr}</td>
                <td className="px-1.5 text-center tabular-nums">{h.rbi}</td>
                <td className="px-1.5 text-center tabular-nums">{h.bb}</td>
                <td className="px-1.5 text-center tabular-nums">{rate(h.avg)}</td>
                <td className="px-1.5 text-center tabular-nums">{rate(h.obp)}</td>
                <td className="px-1.5 text-center tabular-nums">{rate(h.slg)}</td>
                <td className="px-1.5 text-center tabular-nums text-ink">{rate(h.ops)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-vintage">Pitchers</h2>
      <table className="mt-2 w-full font-mono text-[11px]">
        <thead>
          <tr className="border-b border-faded text-ink-faint">
            <th className="py-1 pr-2 text-left font-normal">Pitcher</th>
            <th className="px-1.5 font-normal">G</th>
            <th className="px-1.5 font-normal">IP</th>
            <th className="px-1.5 font-normal">R</th>
            <th className="px-1.5 font-normal">ERA</th>
          </tr>
        </thead>
        <tbody>
          {stats.pitchers.map((p) => (
            <tr key={p.playerId} className="border-b border-faded/30">
              <td className="py-1 pr-2 font-display text-sm">
                {p.name} <span className="font-mono text-[10px] text-ink-faint">{p.role}</span>
              </td>
              <td className="px-1.5 text-center tabular-nums">{p.g}</td>
              <td className="px-1.5 text-center tabular-nums">{p.ip}</td>
              <td className="px-1.5 text-center tabular-nums">{p.r}</td>
              <td className="px-1.5 text-center tabular-nums text-ink">{p.era.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink-faint">
        Starters go 8 innings (and finish the game if they&rsquo;re still throwing a no-hitter); the
        reliever closes otherwise. The engine doesn&rsquo;t track strikeouts or decisions, so K and W–L
        aren&rsquo;t shown.
      </p>
    </div>
  );
}

function GameDetail({ game, nameById }: { game: GameLog; nameById: Map<string, string> }) {
  const innings = Math.max(game.home.innings.length, game.away.innings.length);
  const cols = Array.from({ length: innings }, (_, i) => i);

  return (
    <>
      <h1 className="mt-3 text-center font-display text-2xl font-medium uppercase">
        Game {game.game} · {game.win ? "W" : "L"}
      </h1>

      <div className="mt-4 overflow-x-auto rounded-lg bg-ink p-3">
        <table className="w-full min-w-max font-mono text-[11px] text-paper">
          <thead>
            <tr className="text-gold">
              <th className="px-1 text-left font-normal"> </th>
              {cols.map((i) => (
                <th key={i} className="px-1.5 font-normal tabular-nums">{i + 1}</th>
              ))}
              <th className="px-1.5 font-normal">R</th>
              <th className="px-1.5 font-normal">H</th>
            </tr>
          </thead>
          <tbody>
            <LineRow label="League Avg" line={game.away} cols={cols} />
            <LineRow label="Ghosts" line={game.home} cols={cols} highlight />
          </tbody>
        </table>
      </div>

      <table className="mt-5 w-full font-mono text-[11px]">
        <thead>
          <tr className="border-b border-faded text-ink-faint">
            <th className="py-1 text-left font-normal">Batter</th>
            <th className="px-1 font-normal">AB</th>
            <th className="px-1 font-normal">R</th>
            <th className="px-1 font-normal">H</th>
            <th className="px-1 font-normal">HR</th>
            <th className="px-1 font-normal">RBI</th>
            <th className="px-1 font-normal">BB</th>
          </tr>
        </thead>
        <tbody>
          {game.batting.map((b) => (
            <tr key={b.playerId} className="border-b border-faded/30">
              <td className="truncate py-1 pr-2 font-display text-sm">{nameById.get(b.playerId) ?? b.playerId}</td>
              <td className="px-1 text-center tabular-nums">{b.pa - b.bb}</td>
              <td className="px-1 text-center tabular-nums">{b.r}</td>
              <td className="px-1 text-center tabular-nums">{b.h}</td>
              <td className="px-1 text-center tabular-nums">{b.hr}</td>
              <td className="px-1 text-center tabular-nums">{b.rbi}</td>
              <td className="px-1 text-center tabular-nums">{b.bb}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function LineRow({
  label,
  line,
  cols,
  highlight,
}: {
  label: string;
  line: { runs: number; hits: number; innings: number[] };
  cols: number[];
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? "text-paper" : "text-paper/70"}>
      <td className="px-1 text-left">{label}</td>
      {cols.map((i) => (
        <td key={i} className="px-1.5 text-center tabular-nums">{line.innings[i] ?? "–"}</td>
      ))}
      <td className="px-1.5 text-center font-medium tabular-nums text-gold">{line.runs}</td>
      <td className="px-1.5 text-center tabular-nums">{line.hits}</td>
    </tr>
  );
}
