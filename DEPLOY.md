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

## Analytics (T060)

The Plausible snippet ships inert; it loads only when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
is set at build time. Create the site in Plausible (or a Plausible-class,
cookie-less host), set the env var in Pages, and redeploy. No cookies, no banner.

## Notes

- Re-running the pipeline (`uv run ghostroster-pipeline`) regenerates `public/data/`;
  commit it and redeploy — the site needs no pipeline run at serve time.
- Page weight ~900 KB excluding lazy `data/td/*.json` chunks (each < 100 KB).
