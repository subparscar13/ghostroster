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

## Analytics (T060)

The Plausible snippet ships inert; it loads only when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
is set at build time. Create the site in Plausible (or a Plausible-class,
cookie-less host), set the env var in Pages, and redeploy. No cookies, no banner.

## Notes

- Re-running the pipeline (`uv run ghostroster-pipeline`) regenerates `public/data/`;
  commit it and redeploy — the site needs no pipeline run at serve time.
- Page weight ~900 KB excluding lazy `data/td/*.json` chunks (each < 100 KB).
