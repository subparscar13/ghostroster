/**
 * Ghost Roster leaderboard — Cloudflare Worker + D1 (D-012). A tiny edge API the static
 * GitHub-Pages app calls when `NEXT_PUBLIC_LEADERBOARD_ENDPOINT` is set. Two routes:
 *
 *   POST /scores   — submit a daily result (upsert the best per device+day). Trusted: we
 *                    don't verify the score (friends board). Guards: strict field
 *                    validation, a max body size, and one row per (device, day) so a
 *                    device can't flood a day. CORS is locked to ALLOWED_ORIGIN.
 *   GET  /board    — ?scope=daily&date=YYYY-MM-DD | weekly | alltime. Daily ranks the
 *                    date's rows; weekly/all-time rank each device's BEST single daily
 *                    result (weekly bounded to the current UTC week); all-time adds a
 *                    162-0 count.
 *
 * Per-IP rate limiting is best handled by a Cloudflare dashboard rule (the free WAF);
 * the unique (device,day) constraint already caps per-device writes.
 */

export interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN?: string;
}

const MAX_BODY = 2048;
const LIMIT = 100;

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
      if (
        !isInitials(b.initials) || !isDate(b.dateKey) || !shortStr(b.deviceId, 64) || !b.deviceId ||
        !intIn(b.wins, 0, 162) || !intIn(b.losses, 0, 162) || typeof b.runDiff !== "number" ||
        !shortStr(b.grade, 3) || !shortStr(b.division ?? "", 24) || !shortStr(b.squares ?? "", 64)
      ) {
        return json({ error: "invalid" }, 400, origin);
      }
      await env.DB.prepare(
        `INSERT INTO scores (device_id, initials, date_key, wins, losses, run_diff, grade, squares, division, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9, strftime('%s','now'))
         ON CONFLICT(device_id, date_key) DO UPDATE SET
           initials=excluded.initials, wins=excluded.wins, losses=excluded.losses,
           run_diff=excluded.run_diff, grade=excluded.grade, squares=excluded.squares,
           division=excluded.division, created_at=excluded.created_at
         WHERE excluded.wins > scores.wins
            OR (excluded.wins = scores.wins AND excluded.run_diff > scores.run_diff)`,
      )
        .bind(b.deviceId, b.initials, b.dateKey, b.wins, b.losses, Math.trunc(b.runDiff), b.grade, b.squares ?? "", b.division ?? "")
        .run();
      return json({ ok: true }, 200, origin);
    }

    if (req.method === "GET" && url.pathname === "/board") {
      const scope = url.searchParams.get("scope") ?? "daily";
      let results: Record<string, unknown>[] = [];

      if (scope === "daily") {
        const date = url.searchParams.get("date");
        if (!isDate(date)) return json({ error: "bad date" }, 400, origin);
        const r = await env.DB.prepare(
          `SELECT initials, wins, losses, grade, division, date_key FROM scores
           WHERE date_key=?1 ORDER BY wins DESC, run_diff DESC LIMIT ?2`,
        ).bind(date, LIMIT).all<Record<string, unknown>>();
        results = r.results ?? [];
      } else if (scope === "weekly" || scope === "alltime") {
        const binds: unknown[] = [];
        let where = "";
        if (scope === "weekly") {
          const [start, end] = weekBounds();
          where = "WHERE date_key BETWEEN ?1 AND ?2";
          binds.push(start, end);
        }
        const perfect = scope === "alltime"
          ? ", (SELECT COUNT(*) FROM scores p WHERE p.device_id = s.device_id AND p.wins = 162) AS perfect_count"
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
  const monOffset = (now.getUTCDay() + 6) % 7; // days since Monday (Mon=0 … Sun=6)
  const mon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - monOffset));
  const sun = new Date(mon.getTime() + 6 * 86_400_000);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return [fmt(mon), fmt(sun)];
}
