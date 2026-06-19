# Ghost Roster leaderboard worker (D-012)

A tiny Cloudflare Worker + D1 database that backs the daily/weekly/all-time leaderboard.
It is a **separate deploy** from the static game (which stays on GitHub Pages). The game
only calls it when `NEXT_PUBLIC_LEADERBOARD_ENDPOINT` is set at build time — until then the
whole feature is inert and the app is unchanged.

Integrity posture: **verified for board-topping claims.** The Worker validates fields, caps
body size, and keeps **one best row per (device, day)**. Any claim with `wins >=
VERIFY_MIN_WINS` (default 150) is **re-simulated**: the Worker rebuilds the roster from the
*authoritative* data chunks (it ignores any client vectors), replays `dailySeed(dateKey)`
through the real sim, and rejects (422) on a mismatch. Lower scores — which don't top the
board — are trusted, to bound CPU. Set `VERIFY_MIN_WINS` higher if you hit Worker CPU limits.

`DATA_BASE_URL` must point at the deployed site's data dir (e.g.
`https://subparscar13.github.io/ghostroster/data`) so verification can read real vectors.

Two boards via `mode`: **`daily`** (the shared daily challenge) and **`classic`** (the regular
game — a "best season" board). Daily replays the date-derived seed to verify; classic replays
the run's **own seed**, sent in the body.

## Routes
- `POST /scores` — body: `{ mode, dateKey, initials, deviceId, wins, losses, runDiff, grade, squares, division, picks, seed? }`. `mode` is `daily`|`classic`; `picks` is `[{ playerId, slot, chunk }]` (no vectors — the Worker fetches authoritative vectors itself); `seed` is required for `classic`. Upserts the best result per `(deviceId, dateKey, mode)`.
- `GET /board?scope=daily&mode=daily&date=YYYY-MM-DD` — that day's ranking (wins desc, run-diff tiebreak).
- `GET /board?scope=weekly&mode=daily|classic` — each device's best single result this UTC week.
- `GET /board?scope=alltime&mode=daily|classic` — each device's best single result ever (+ a 162-0 count).

## Deploy (operator, one-time)
```sh
cd worker
npm install
npx wrangler login

# create the D1 database, then paste its id into wrangler.toml (database_id)
npx wrangler d1 create ghostroster-leaderboard

# apply the schema (remote)
npx wrangler d1 execute ghostroster-leaderboard --remote --file=./schema.sql

# lock CORS to the site origin in wrangler.toml: ALLOWED_ORIGIN = "https://subparscar13.github.io"
npx wrangler deploy
```
`wrangler deploy` prints the Worker URL (e.g. `https://ghostroster-leaderboard.<sub>.workers.dev`).
Set that as the GitHub repo **Variable** `LEADERBOARD_ENDPOINT` (wired into `.github/workflows/deploy.yml`)
to turn the feature on at the next build.

## Local dev
```sh
cd worker
npm install
npx wrangler d1 execute ghostroster-leaderboard --local --file=./schema.sql
npx wrangler dev        # serves http://localhost:8787
```
Then run the app with `NEXT_PUBLIC_LEADERBOARD_ENDPOINT=http://localhost:8787` in `.env.local`.
