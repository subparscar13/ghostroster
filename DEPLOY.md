# Deploy — Ghost Roster

Static Next.js export (D-005): `next build` with `output: 'export'` writes a fully
static site to `out/`. No server, no backend. Host: **Cloudflare Pages** free tier.

## Build

```sh
npm ci
npm run build        # → out/  (HTML + _next/ + data/)
```

`out/` is self-contained: open `out/index.html` after a build to smoke-test locally,
or `npx serve out`.

## Cloudflare Pages (one-time setup — operator action)

Connect the GitHub repo in the Cloudflare dashboard (Workers & Pages → Create →
Pages → Connect to Git), then set:

| Setting | Value |
|---|---|
| Framework preset | Next.js (Static HTML Export) — or "None" |
| Build command | `npm run build` |
| Build output directory | `out` |
| Node version | 22 (from `.nvmrc`, or set `NODE_VERSION=22`) |
| Environment variables | *(optional)* `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=ghostroster.app` to turn on analytics |

Cloudflare honors `public/_headers` (caching) automatically. Static export emits
`404.html`, which Pages serves for unknown paths.

## Custom domain

After registering **ghostroster.app** (operator action, time-sensitive — D-006):
Pages project → Custom domains → add `ghostroster.app`; Cloudflare manages the DNS +
TLS. Update `TIP_JAR` in `src/components/Footer.tsx` to the real tip-jar URL before
launch.

## GitHub Pages (simplest for sharing with friends)

The repo includes `.github/workflows/deploy.yml`, which builds the static export and
publishes it on every push to `main`. Because GitHub *project* pages serve from a
sub-path, the workflow builds with `NEXT_PUBLIC_BASE_PATH=/ghostroster` (matches the
repo name) so routes, assets, and the data fetch resolve correctly; local dev and
root hosts leave it unset.

One-time setup (operator):

1. Push the repo to GitHub (`gh auth login`, then `gh repo create ghostroster --public --source=. --push` — Pages needs a public repo on the free plan).
2. Repo **Settings → Pages → Source = "GitHub Actions"**.
3. Push to `main` (or run the workflow manually) — it deploys to
   `https://<owner>.github.io/ghostroster/`.

If the repo is named something other than `ghostroster`, change `NEXT_PUBLIC_BASE_PATH`
in the workflow to `/<repo-name>`. `.nojekyll` is emitted so Pages serves the `_next/`
folder. No custom domain needed to share for feedback.

## In-app comment box (T075 / D-010)

A "leave a comment" button + modal (anyone, no login) that POSTs to a third-party
form service — no backend (constitution IV). It ships **inert** until configured.

1. Create a free form at a Formspree-class service; copy its endpoint URL (e.g.
   `https://formspree.io/f/abcdwxyz`). Submissions land in that service's dashboard/inbox.
2. Set `NEXT_PUBLIC_COMMENT_ENDPOINT` to that URL:
   - **GitHub Pages:** repo → Settings → Secrets and variables → Actions → Variables →
     add `COMMENT_ENDPOINT` (the workflow passes it to the build).
   - **Cloudflare Pages:** add `NEXT_PUBLIC_COMMENT_ENDPOINT` to the build env vars.
3. Redeploy. The endpoint is inlined at build time (it's a public client-side POST
   target, not a secret). A honeypot + the service's spam filter handle bots.

## Leaderboard (T083 / D-012)

Daily / weekly / all-time leaderboard for daily-challenge scores (arcade 3-initials, no
login). Backed by a **separately-deployed Cloudflare Worker + D1** in `worker/`; the static
app calls it only when `NEXT_PUBLIC_LEADERBOARD_ENDPOINT` is set, so it ships **inert** until
you wire it up. Full steps in `worker/README.md`. Short version (operator, one-time):

1. `cd worker && npm install && npx wrangler login`
2. `npx wrangler d1 create ghostroster-leaderboard` → paste the printed `database_id` into `worker/wrangler.toml`.
3. `npx wrangler d1 execute ghostroster-leaderboard --remote --file=./schema.sql`
4. Lock CORS in `wrangler.toml` (`ALLOWED_ORIGIN = "https://subparscar13.github.io"`), then `npx wrangler deploy` → copy the Worker URL.
5. Set `LEADERBOARD_ENDPOINT` (the Worker URL) as a GitHub repo **Variable** (Settings → Secrets and variables → Actions → Variables); the workflow passes it as `NEXT_PUBLIC_LEADERBOARD_ENDPOINT`. Redeploy.

Board-topping claims (`wins >= VERIFY_MIN_WINS`, default 150) are **re-simulated server-side**
to verify them — the Worker rebuilds the roster from authoritative data (`DATA_BASE_URL`, set
to your site's `/data` dir) and replays the day's seed; mismatches are rejected. Lower scores
are trusted, to bound CPU (raise `VERIFY_MIN_WINS` if the Worker hits CPU limits). Add a
Cloudflare rate-limit rule for extra protection.

## Analytics (T060)

The Plausible snippet ships inert; it loads only when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
is set at build time. Create the site in Plausible (or a Plausible-class,
cookie-less host), set the env var in Pages, and redeploy. No cookies, no banner.

## Notes

- Re-running the pipeline (`uv run ghostroster-pipeline`) regenerates `public/data/`;
  commit it and redeploy — the site needs no pipeline run at serve time.
- Page weight ~900 KB excluding lazy `data/td/*.json` chunks (each < 100 KB).
