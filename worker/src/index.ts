/**
 * Ghost Roster leaderboard — Cloudflare Worker + D1 (D-012). A tiny edge API the static
 * GitHub-Pages app calls when `NEXT_PUBLIC_LEADERBOARD_ENDPOINT` is set.
 *
 *   POST /scores — submit a daily result (upsert the best per device+day). High claims
 *                  (>= VERIFY_MIN_WINS) are VERIFIED: the Worker rebuilds the roster from
 *                  the *authoritative* data chunks (never client vectors), replays the
 *                  day's seed through the real sim, and rejects on a mismatch. Lower
 *                  scores (don't top the board) are trusted to bound CPU. Guards: strict
 *                  field validation, max body size, one row per (device, day).
 *   GET  /board  — ?scope=daily&date=YYYY-MM-DD | weekly | alltime.
 *
 * Verification reuses the app's pure sim (imported from ../../src/sim), so it can never
 * drift from gameplay. CORS is locked to ALLOWED_ORIGIN.
 */

import { LEAGUE_AVERAGE_OPPONENT } from "../../src/sim/baseline";
import { hashSeed } from "../../src/sim/rng";
import { simulateSeason } from "../../src/sim/season";
import type { Roster } from "../../src/sim/types";

export interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN?: string;
  DATA_BASE_URL?: string; // e.g. https://subparscar13.github.io/ghostroster/data
  VERIFY_MIN_WINS?: string; // claims at/above this are re-simulated (default 150)
}

const MAX_BODY = 4096;
const LIMIT = 100;
const HITTER_SLOTS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];

const cors = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});
const json = (data: unknown, status: number, origin: string) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isInitials = (s: unknown): s is string => typeof s === "string" && /^[A-Z]{3}$/.test(s);
const intIn = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
const shortStr = (v: unknown, n: number): v is string => typeof v === "string" && v.length <= n;

/** Daily season seed — must match the app's `dailySeed` exactly. */
const dailySeed = (dateKey: string): number => hashSeed(`ghostroster|${dateKey}|season`);

type Pick = { playerId: string; slot: string; chunk: string };
type Chunk = { hitters: { playerId: string; name: string; pos: string[]; vector: unknown; display: { OPS: string } }[]; pitchers: { playerId: string; name: string; role: string; allowed: unknown; stamina: number }[] };

async function fetchChunks(picks: Pick[], base: string): Promise<Map<string, Chunk> | null> {
  const paths = [...new Set(picks.map((p) => p.chunk))];
  const out = new Map<string, Chunk>();
  const cache = caches.default;
  for (const path of paths) {
    const url = `${base}/${path}`;
    let res = await cache.match(url);
    if (!res) {
      res = await fetch(url);
      if (res.ok) await cache.put(url, res.clone());
    }
    if (!res.ok) return null;
    out.set(path, (await res.json()) as Chunk);
  }
  return out;
}

/** Rebuild the exact sim roster the client used: 9 hitters in slot order then sorted by
 * OPS desc (matches buildSimRoster), SP1–3, RP — all from authoritative vectors. */
function rebuildRoster(picks: Pick[], chunks: Map<string, Chunk>): Roster | null {
  const hitter = (slot: string) => {
    const p = picks.find((x) => x.slot === slot);
    const h = p && chunks.get(p.chunk)?.hitters.find((x) => x.playerId === p.playerId);
    return h || null;
  };
  const pitcher = (slot: string, role: string) => {
    const p = picks.find((x) => x.slot === slot);
    const pit = p && chunks.get(p.chunk)?.pitchers.find((x) => x.playerId === p.playerId);
    return pit && pit.role === role ? pit : null;
  };

  const hs = HITTER_SLOTS.map(hitter);
  if (hs.some((h) => !h)) return null;
  const lineup = [...hs]
    .sort((a, b) => Number.parseFloat(b!.display.OPS) - Number.parseFloat(a!.display.OPS))
    .map((h) => ({ playerId: h!.playerId, name: h!.name, pos: h!.pos, vector: h!.vector as Roster["lineup"][number]["vector"] }));

  const sps = ["SP1", "SP2", "SP3"].map((s) => pitcher(s, "SP"));
  const rp = pitcher("RP", "RP");
  if (sps.some((p) => !p) || !rp) return null;
  const toP = (p: NonNullable<ReturnType<typeof pitcher>>, role: "SP" | "RP") =>
    ({ playerId: p.playerId, name: p.name, role, allowed: p.allowed as Roster["bullpen"][number]["allowed"], stamina: p.stamina });

  return { lineup, rotation: sps.map((p) => toP(p!, "SP")), bullpen: [toP(rp, "RP")] };
}

async function verifyClaim(b: Record<string, unknown>, env: Env, simSeed: number): Promise<{ ok: boolean; reason?: string }> {
  if (!env.DATA_BASE_URL) return { ok: false, reason: "verification unavailable" };
  const picks = b.picks as Pick[] | undefined;
  if (!Array.isArray(picks) || picks.length !== 13 || picks.some((p) => !p || typeof p.playerId !== "string" || !shortStr(p.chunk, 64) || !p.chunk)) {
    return { ok: false, reason: "missing roster" };
  }
  const chunks = await fetchChunks(picks, env.DATA_BASE_URL.replace(/\/$/, ""));
  if (!chunks) return { ok: false, reason: "data fetch failed" };
  const roster = rebuildRoster(picks, chunks);
  if (!roster) return { ok: false, reason: "roster rebuild failed" };
  let actual: number;
  try {
    actual = simulateSeason(roster, LEAGUE_AVERAGE_OPPONENT, simSeed).record.w;
  } catch {
    return { ok: false, reason: "sim failed" };
  }
  return actual === b.wins ? { ok: true } : { ok: false, reason: `wins mismatch (claimed ${b.wins}, simulated ${actual})` };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || "*";
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/scores") {
      const raw = await req.text();
      if (raw.length > MAX_BODY) return json({ error: "too large" }, 413, origin);
      let b: Record<string, unknown>;
      try {
        b = JSON.parse(raw);
      } catch {
        return json({ error: "bad json" }, 400, origin);
      }
      const mode = b.mode === "classic" ? "classic" : "daily";
      if (
        !isInitials(b.initials) || !isDate(b.dateKey) || !shortStr(b.deviceId, 64) || !b.deviceId ||
        !intIn(b.wins, 0, 162) || !intIn(b.losses, 0, 162) || typeof b.runDiff !== "number" ||
        !shortStr(b.grade, 3) || !shortStr(b.division ?? "", 24) || !shortStr(b.squares ?? "", 64) ||
        (mode === "classic" && !intIn(b.seed, 0, 0xffffffff))
      ) {
        return json({ error: "invalid" }, 400, origin);
      }

      // Verify board-topping claims by replaying the real sim; trust the rest (CPU bound).
      // Daily replays the date-derived seed; classic replays the run's own submitted seed.
      const simSeed = mode === "classic" ? (b.seed as number) : dailySeed(b.dateKey as string);
      const minVerify = Number.parseInt(env.VERIFY_MIN_WINS ?? "150", 10);
      if (Number.isFinite(minVerify) && b.wins >= minVerify) {
        const v = await verifyClaim(b, env, simSeed);
        if (!v.ok) return json({ error: "verification failed", reason: v.reason }, 422, origin);
      }

      await env.DB.prepare(
        `INSERT INTO scores (device_id, initials, date_key, mode, wins, losses, run_diff, grade, squares, division, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10, strftime('%s','now'))
         ON CONFLICT(device_id, date_key, mode) DO UPDATE SET
           initials=excluded.initials, wins=excluded.wins, losses=excluded.losses,
           run_diff=excluded.run_diff, grade=excluded.grade, squares=excluded.squares,
           division=excluded.division, created_at=excluded.created_at
         WHERE excluded.wins > scores.wins
            OR (excluded.wins = scores.wins AND excluded.run_diff > scores.run_diff)`,
      )
        .bind(b.deviceId, b.initials, b.dateKey, mode, b.wins, b.losses, Math.trunc(b.runDiff), b.grade, b.squares ?? "", b.division ?? "")
        .run();
      return json({ ok: true }, 200, origin);
    }

    if (req.method === "GET" && url.pathname === "/board") {
      const scope = url.searchParams.get("scope") ?? "daily";
      const mode = url.searchParams.get("mode") === "classic" ? "classic" : "daily";
      let results: Record<string, unknown>[] = [];

      if (scope === "daily") {
        const date = url.searchParams.get("date");
        if (!isDate(date)) return json({ error: "bad date" }, 400, origin);
        const r = await env.DB.prepare(
          `SELECT initials, wins, losses, grade, division, date_key FROM scores
           WHERE date_key=?1 AND mode=?2 ORDER BY wins DESC, run_diff DESC LIMIT ?3`,
        ).bind(date, mode, LIMIT).all<Record<string, unknown>>();
        results = r.results ?? [];
      } else if (scope === "weekly" || scope === "alltime") {
        const binds: unknown[] = [mode];
        let where = "WHERE mode = ?1";
        if (scope === "weekly") {
          const [start, end] = weekBounds();
          where += " AND date_key BETWEEN ?2 AND ?3";
          binds.push(start, end);
        }
        // perfect_count is scoped to the same board via s.mode (s is already filtered to `mode`).
        const perfect = scope === "alltime"
          ? ", (SELECT COUNT(*) FROM scores p WHERE p.device_id = s.device_id AND p.mode = s.mode AND p.wins = 162) AS perfect_count"
          : "";
        const r = await env.DB.prepare(
          `SELECT s.initials, s.wins, s.losses, s.grade, s.division, s.date_key${perfect}
           FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY wins DESC, run_diff DESC) rn
                 FROM scores ${where}) s
           WHERE s.rn = 1 ORDER BY s.wins DESC, s.run_diff DESC LIMIT ${LIMIT}`,
        ).bind(...binds).all<Record<string, unknown>>();
        results = r.results ?? [];
      } else {
        return json({ error: "bad scope" }, 400, origin);
      }

      const rows = results.map((row, i) => ({
        rank: i + 1,
        initials: row.initials,
        wins: row.wins,
        losses: row.losses,
        grade: row.grade,
        division: row.division,
        dateKey: row.date_key,
        ...(row.perfect_count != null ? { perfectCount: row.perfect_count } : {}),
      }));
      return json({ rows }, 200, origin);
    }

    return json({ error: "not found" }, 404, origin);
  },
};

/** [Monday, Sunday] of the current UTC week as YYYY-MM-DD. */
function weekBounds(): [string, string] {
  const now = new Date();
  const monOffset = (now.getUTCDay() + 6) % 7;
  const mon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - monOffset));
  const sun = new Date(mon.getTime() + 6 * 86_400_000);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return [fmt(mon), fmt(sun)];
}
