# Ghost Roster leaderboard worker (D-012)

A tiny Cloudflare Worker + D1 database that backs the daily/weekly/all-time leaderboard.
It is a **separate deploy** from the static game (which stays on GitHub Pages). The game
only calls it when `NEXT_PUBLIC_LEADERBOARD_ENDPOINT` is set at build time — until then the
whole feature is inert and the app is unchanged.

Integrity posture: **trusted** (a friends board). The Worker validates fields, caps body
size, and keeps **one best row per (device, day)**; it does **not** verify the score. If
abuse ever appears, on-submit re-simulation is a clean drop-in (the sim is pure + seeded).

## Routes
- `POST /scores` — body: `{ dateKey, initials, deviceId, wins, losses, runDiff, grade, squares, division }`. Upserts the best result per `(deviceId, dateKey)`.
- `GET /board?scope=daily&date=YYYY-MM-DD` — that day's ranking (wins desc, run-diff tiebreak).
- `GET /board?scope=weekly` — each device's best single daily result this UTC week.
- `GET /board?scope=alltime` — each device's best single daily result ever (+ a 162-0 count).

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
