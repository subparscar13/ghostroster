/**
 * On-device share card (T051): render the result to a canvas and share/download it
 * with no server round-trip (constitution IV). Native Web Share with the PNG file
 * where supported (mobile), download fallback otherwise (desktop).
 */

import type { SeasonResult } from "@/sim/types";
import { ALL_SLOTS } from "./draft";
import { primaryHighlight, quip } from "./result";
import type { DraftPick, Slot } from "./types";

const W = 1080;
const H = 1350;
const PAPER = "#f1e7cf";
const INK = "#2a2118";
const RED = "#9e2b25";
const GOLD = "#8a5a14";
const FADED = "#7a6a4a";

/** Plain-text caption that accompanies the image / falls back when no image shares. */
export function shareText(result: SeasonResult): string {
  return `Ghost Roster — ${result.record.w}-${result.record.l} (${result.grade}). Chasing 162-0.`;
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draw the vintage result card. Uses Georgia (serif) + monospace so it renders
 * identically without waiting on web-font loading. */
export function renderResultCard(result: SeasonResult, picks: DraftPick[]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  ctx.textAlign = "center";
  ctx.fillStyle = RED;
  ctx.font = "600 38px Georgia, serif";
  ctx.fillText("GHOST ROSTER", W / 2, 110);

  ctx.fillStyle = FADED;
  ctx.font = "26px monospace";
  ctx.fillText("FINAL RECORD", W / 2, 185);

  ctx.fillStyle = RED;
  ctx.font = "700 150px Georgia, serif";
  ctx.fillText(`${result.record.w}–${result.record.l}`, W / 2, 320);

  // grade seal
  ctx.beginPath();
  ctx.arc(W / 2, 410, 58, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.font = "600 56px Georgia, serif";
  ctx.fillText(result.grade, W / 2, 430);

  // roster, in slot order
  const bySlot = new Map(picks.map((p) => [p.slot, p]));
  let y = 540;
  for (const slot of ALL_SLOTS as Slot[]) {
    const pick = bySlot.get(slot);
    if (!pick) continue;
    ctx.textAlign = "left";
    ctx.fillStyle = GOLD;
    ctx.font = "22px monospace";
    ctx.fillText(slot.padEnd(3, " "), 130, y);
    ctx.fillStyle = INK;
    ctx.font = "30px Georgia, serif";
    ctx.fillText(fit(ctx, pick.name, 580), 220, y);
    ctx.textAlign = "right";
    ctx.fillStyle = FADED;
    ctx.font = "24px monospace";
    ctx.fillText(pick.tag, W - 130, y);
    y += 40;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = "26px monospace";
  ctx.fillText(`★ ${primaryHighlight(result)}`, W / 2, y + 36);

  ctx.fillStyle = INK;
  ctx.font = "italic 34px Georgia, serif";
  const quipLines = wrap(ctx, `“${quip(result)}”`, 860);
  quipLines.forEach((line, i) => ctx.fillText(line, W / 2, y + 96 + i * 44));

  ctx.fillStyle = FADED;
  ctx.font = "20px monospace";
  ctx.fillText("Lahman Database (CC BY-SA) · not affiliated with MLB/MLBPA", W / 2, H - 56);

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** Generate the card and share it (native share with the file, else download). */
export async function shareResultImage(result: SeasonResult, picks: DraftPick[]): Promise<"shared" | "downloaded" | "failed"> {
  const blob = await canvasToBlob(renderResultCard(result, picks));
  if (!blob) return "failed";
  const file = new File([blob], "ghost-roster.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };

  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Ghost Roster", text: shareText(result) });
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "shared"; // user cancelled
      // otherwise fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ghost-roster.png";
  a.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
