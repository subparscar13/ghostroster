"use client";

import { ALL_SLOTS } from "@/lib/draft";
import type { DraftPick, Slot } from "@/lib/types";
import { PlayerName } from "./PlayerName";

const LABEL: Record<Slot, string> = {
  C: "C", "1B": "1B", "2B": "2B", "3B": "3B", SS: "SS", LF: "LF", CF: "CF", RF: "RF", DH: "DH",
  SP1: "SP1", SP2: "SP2", SP3: "SP3", RP: "RP",
};

/** Persistent 13-slot roster card: filled slots show the player + era tag, open
 * slots are dashed. Shown above the draft pool every round. */
export function RosterSidebar({ picks }: { picks: DraftPick[] }) {
  const bySlot = new Map(picks.map((p) => [p.slot, p]));
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {ALL_SLOTS.map((slot) => {
        const pick = bySlot.get(slot);
        return (
          <div
            key={slot}
            className={`rounded-md border px-2 py-1.5 ${
              pick ? "border-transparent bg-ink text-paper" : "border-dashed border-faded"
            }`}
          >
            <div className={`font-mono text-[9px] uppercase tracking-wider ${pick ? "text-gold" : "text-ink-faint"}`}>
              {LABEL[slot]}
            </div>
            {pick ? (
              <>
                <div className="truncate font-display text-xs leading-tight">
                  <PlayerName
                    name={pick.name}
                    allStar={(pick.hitter ?? pick.pitcher)?.allStar}
                    hof={(pick.hitter ?? pick.pitcher)?.hof}
                    onDark
                  />
                </div>
                <div className="font-mono text-[9px] text-faded">{pick.tag}</div>
              </>
            ) : (
              <div className="font-mono text-[11px] text-ink-faint/50">—</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
