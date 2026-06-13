"use client";

import { needs } from "@/lib/draft";
import type { DraftPick, PoolHitter, PoolPitcher, TeamDecadeChunk } from "@/lib/types";
import { RosterSidebar } from "./RosterSidebar";

type Props = {
  chunk: TeamDecadeChunk;
  picks: DraftPick[];
  round: number;
  onPickHitter: (h: PoolHitter, tag: string) => void;
  onPickPitcher: (p: PoolPitcher, tag: string) => void;
};

const eraTag = (year: number, team: string) => `'${String(year).slice(-2)} ${team}`;
const num = (s: string) => Number.parseFloat(s) || 0;

export function DraftScreen({ chunk, picks, round, onPickHitter, onPickPitcher }: Props) {
  const open = needs(picks);
  const drafted = new Set(picks.map((p) => p.playerId));

  const hitters = [...chunk.hitters].sort((a, b) => num(b.display.OPS) - num(a.display.OPS));
  const starters = chunk.pitchers.filter((p) => p.role === "SP").sort((a, b) => num(a.display.ERA) - num(b.display.ERA));
  const relievers = chunk.pitchers.filter((p) => p.role === "RP").sort((a, b) => num(a.display.ERA) - num(b.display.ERA));

  return (
    <div className="mx-auto max-w-md px-4 pt-8 pb-10">
      <p className="text-center font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">Round {round} of 13</p>
      <h1 className="mt-1 text-center font-display text-2xl font-medium uppercase">
        {chunk.decade}s {chunk.franchise}
      </h1>
      <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-wider text-ink-soft">
        need: {open.hitters} hitters · {open.sp} SP · {open.rp} RP
      </p>

      <div className="my-4 rounded-lg border border-faded/60 bg-paper-dark/40 p-2">
        <RosterSidebar picks={picks} />
      </div>

      <Section title="Hitters" disabled={open.hitters === 0}>
        {hitters.map((h) => (
          <PlayerRow
            key={h.playerId}
            name={h.name}
            meta={h.pos.join("/")}
            stats={`${h.display.AVG} avg · ${h.display.HR} hr · ${h.display.OPS} ops`}
            disabled={open.hitters === 0 || drafted.has(h.playerId)}
            picked={drafted.has(h.playerId)}
            onClick={() => onPickHitter(h, eraTag(h.display.year, h.display.team))}
          />
        ))}
      </Section>

      <Section title="Starters" disabled={open.sp === 0}>
        {starters.map((p) => (
          <PlayerRow
            key={p.playerId}
            name={p.name}
            meta="SP"
            stats={`${p.display.W}-${p.display.L} · ${p.display.ERA} era · ${p.display.SO} k`}
            disabled={open.sp === 0 || drafted.has(p.playerId)}
            picked={drafted.has(p.playerId)}
            onClick={() => onPickPitcher(p, eraTag(p.display.year, p.display.team))}
          />
        ))}
      </Section>

      <Section title="Relievers" disabled={open.rp === 0}>
        {relievers.map((p) => (
          <PlayerRow
            key={p.playerId}
            name={p.name}
            meta="RP"
            stats={`${p.display.W}-${p.display.L} · ${p.display.ERA} era · ${p.display.SO} k`}
            disabled={open.rp === 0 || drafted.has(p.playerId)}
            picked={drafted.has(p.playerId)}
            onClick={() => onPickPitcher(p, eraTag(p.display.year, p.display.team))}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, disabled, children }: { title: string; disabled: boolean; children: React.ReactNode }) {
  return (
    <section className={`mt-5 ${disabled ? "opacity-40" : ""}`}>
      <h2 className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-vintage">
        {title} {disabled ? "· full" : ""}
      </h2>
      <div className="divide-y divide-faded/40 rounded-lg border border-faded/50">{children}</div>
    </section>
  );
}

function PlayerRow({
  name,
  meta,
  stats,
  disabled,
  picked,
  onClick,
}: {
  name: string;
  meta: string;
  stats: string;
  disabled: boolean;
  picked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
        disabled ? "cursor-not-allowed" : "hover:bg-gold/10 active:bg-gold/20"
      }`}
    >
      <span className="min-w-0">
        <span className={`block truncate font-display text-sm ${picked ? "text-ink-faint line-through" : "text-ink"}`}>
          {name} <span className="font-mono text-[10px] text-ink-faint">{meta}</span>
        </span>
        <span className="block font-mono text-[10px] text-ink-soft">{stats}</span>
      </span>
      {!disabled && <span className="font-mono text-[10px] uppercase text-navy">draft →</span>}
      {picked && <span className="font-mono text-[10px] uppercase text-ink-faint">drafted</span>}
    </button>
  );
}
