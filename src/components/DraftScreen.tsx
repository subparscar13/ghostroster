"use client";

import { useState } from "react";

import { autoSlotHitter, autoSlotPitcher, needs, ownOpenSlots } from "@/lib/draft";
import { REROLLS_PER_RUN } from "@/lib/spin";
import type { DraftPick, PoolHitter, PoolPitcher, Slot, TeamDecadeChunk } from "@/lib/types";
import { PlayerName } from "./PlayerName";
import { RosterSidebar } from "./RosterSidebar";

type Props = {
  chunk: TeamDecadeChunk;
  picks: DraftPick[];
  round: number;
  rerollsUsed: { team: number; era: number };
  canRerollTeam: boolean;
  canRerollEra: boolean;
  onRerollTeam: () => void;
  onRerollEra: () => void;
  onRespin: () => void;
  onPickHitter: (h: PoolHitter, tag: string, slot?: Slot) => void;
  onPickPitcher: (p: PoolPitcher, tag: string) => void;
};

type Tab = "hitters" | "pitchers";

const eraTag = (year: number, team: string) => `'${String(year).slice(-2)} ${team}`;
const num = (s: string) => Number.parseFloat(s) || 0;

export function DraftScreen({
  chunk,
  picks,
  round,
  rerollsUsed,
  canRerollTeam,
  canRerollEra,
  onRerollTeam,
  onRerollEra,
  onRespin,
  onPickHitter,
  onPickPitcher,
}: Props) {
  const [tab, setTab] = useState<Tab>("hitters");
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const open = needs(picks);
  const drafted = new Set(picks.map((p) => p.playerId));

  const hitters = [...chunk.hitters].sort((a, b) => num(b.display.OPS) - num(a.display.OPS));
  const starters = chunk.pitchers.filter((p) => p.role === "SP").sort((a, b) => num(a.display.ERA) - num(b.display.ERA));
  const relievers = chunk.pitchers.filter((p) => p.role === "RP").sort((a, b) => num(a.display.ERA) - num(b.display.ERA));

  const hitterDraftable = (h: PoolHitter) => !drafted.has(h.playerId) && autoSlotHitter(h.pos, picks) !== null;
  const spDraftable = (p: PoolPitcher) => !drafted.has(p.playerId) && autoSlotPitcher("SP", picks) !== null;
  const rpDraftable = (p: PoolPitcher) => !drafted.has(p.playerId) && autoSlotPitcher("RP", picks) !== null;

  const anyDraftable =
    hitters.some(hitterDraftable) || starters.some(spDraftable) || relievers.some(rpDraftable);
  const incomplete = open.hitters + open.sp + open.rp > 0;

  return (
    <div className="mx-auto max-w-md px-4 pt-8 pb-10">
      <p className="text-center font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">Round {round} of 13</p>
      <h1 className="mt-1 text-center font-display text-2xl font-medium uppercase">
        {chunk.decade}s {chunk.franchise}
      </h1>
      <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-wider text-ink-soft">
        need: {open.hitters} hitters · {open.sp} SP · {open.rp} RP
      </p>

      <div className="mt-3 flex justify-center gap-2">
        <Reroll label="Re-roll team" remaining={REROLLS_PER_RUN - rerollsUsed.team} disabled={!canRerollTeam} onClick={onRerollTeam} />
        <Reroll label="Re-roll decade" remaining={REROLLS_PER_RUN - rerollsUsed.era} disabled={!canRerollEra} onClick={onRerollEra} />
      </div>

      <div className="my-4 rounded-lg border border-faded/60 bg-paper-dark/40 p-2">
        <RosterSidebar picks={picks} />
      </div>

      {!anyDraftable && incomplete && (
        <div className="mb-4 rounded-lg border border-vintage/50 bg-vintage/5 p-3 text-center">
          <p className="font-mono text-xs text-vintage">No player here fits an open slot.</p>
          <button onClick={onRespin} className="mt-2 rounded-md bg-vintage px-5 py-2 font-mono text-xs uppercase tracking-widest text-paper">
            Spin again (free)
          </button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <TabButton active={tab === "hitters"} onClick={() => setTab("hitters")}>
          Hitters
        </TabButton>
        <TabButton active={tab === "pitchers"} onClick={() => setTab("pitchers")}>
          Pitchers
        </TabButton>
      </div>

      {tab === "hitters" ? (
        <Section title="Hitters">
          {hitters.map((h) => {
            const tag = eraTag(h.display.year, h.display.team);
            const slots = ownOpenSlots(h.pos, picks);
            const draftable = hitterDraftable(h);
            return (
              <div key={h.playerId}>
                <PlayerRow
                  name={h.name}
                  meta={h.pos.join("/")}
                  stats={`${h.display.AVG} avg · ${h.display.HR} hr · ${h.display.OPS} ops`}
                  allStar={h.allStar}
                  hof={h.hof}
                  draftable={draftable}
                  picked={drafted.has(h.playerId)}
                  onClick={() => {
                    if (!draftable) return;
                    if (slots.length >= 2) setPickerFor(pickerFor === h.playerId ? null : h.playerId);
                    else onPickHitter(h, tag); // single eligible position (or DH fallback) → auto
                  }}
                />
                {pickerFor === h.playerId && (
                  <div className="flex flex-wrap items-center gap-1.5 bg-gold/5 px-3 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">play at:</span>
                    {slots.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setPickerFor(null);
                          onPickHitter(h, tag, s);
                        }}
                        className="rounded border border-navy px-2.5 py-1 font-mono text-[11px] uppercase text-navy hover:bg-navy hover:text-paper"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Section>
      ) : (
        <>
          <Section title="Starters">
            {starters.map((p) => (
              <PlayerRow
                key={p.playerId}
                name={p.name}
                meta="SP"
                stats={`${p.display.W}-${p.display.L} · ${p.display.ERA} era · ${p.display.SO} k`}
                allStar={p.allStar}
                hof={p.hof}
                draftable={spDraftable(p)}
                picked={drafted.has(p.playerId)}
                onClick={() => onPickPitcher(p, eraTag(p.display.year, p.display.team))}
              />
            ))}
          </Section>
          <Section title="Relievers">
            {relievers.map((p) => (
              <PlayerRow
                key={p.playerId}
                name={p.name}
                meta="RP"
                stats={`${p.display.W}-${p.display.L} · ${p.display.ERA} era · ${p.display.SO} k`}
                allStar={p.allStar}
                hof={p.hof}
                draftable={rpDraftable(p)}
                picked={drafted.has(p.playerId)}
                onClick={() => onPickPitcher(p, eraTag(p.display.year, p.display.team))}
              />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] transition-colors ${
        active ? "border-transparent bg-ink text-paper" : "border-faded text-ink-soft hover:bg-gold/10"
      }`}
    >
      {children}
    </button>
  );
}

function Reroll({ label, remaining, disabled, onClick }: { label: string; remaining: number; disabled?: boolean; onClick: () => void }) {
  const spent = remaining <= 0 || disabled;
  return (
    <button
      onClick={onClick}
      disabled={spent}
      className={`flex-1 rounded-md border px-2 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${
        spent ? "cursor-not-allowed border-faded/50 text-ink-faint/50 line-through" : "border-gold text-gold-ink hover:bg-gold/10"
      }`}
    >
      {label} · {Math.max(0, remaining)}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-2">
      <h2 className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-vintage">{title}</h2>
      <div className="divide-y divide-faded/40 rounded-lg border border-faded/50">{children}</div>
    </section>
  );
}

function PlayerRow({
  name,
  meta,
  stats,
  allStar,
  hof,
  draftable,
  picked,
  onClick,
}: {
  name: string;
  meta: string;
  stats: string;
  allStar?: boolean;
  hof?: boolean;
  draftable: boolean;
  picked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!draftable}
      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
        draftable ? "hover:bg-gold/10 active:bg-gold/20" : "cursor-not-allowed opacity-45"
      }`}
    >
      <span className="min-w-0">
        <span className={`block truncate font-display text-sm text-ink ${picked ? "line-through" : ""}`}>
          <PlayerName name={name} allStar={allStar} hof={hof} /> <span className="font-mono text-[10px] text-ink-faint">{meta}</span>
        </span>
        <span className="block font-mono text-[10px] text-ink-soft">{stats}</span>
      </span>
      {draftable && <span className="font-mono text-[10px] uppercase text-navy">draft →</span>}
      {picked && <span className="font-mono text-[10px] uppercase text-ink-faint">drafted</span>}
      {!draftable && !picked && <span className="font-mono text-[10px] uppercase text-ink-faint">slot full</span>}
    </button>
  );
}
