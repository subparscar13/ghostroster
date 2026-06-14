import Script from "next/script";

/**
 * Privacy-light analytics (T060). Plausible-class: no cookies, no personal data.
 * Inert until `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set at build time, so it ships dead
 * weight (nothing) until the operator wires a real domain — no account needed to land
 * this code. Set the env var in the host's build settings to enable.
 */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  return <Script defer data-domain={domain} src="https://plausible.io/js/script.js" strategy="afterInteractive" />;
}
