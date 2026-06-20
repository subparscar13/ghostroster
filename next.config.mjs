/** @type {import('next').NextConfig} */

// Sub-path for hosts that don't serve at the domain root (GitHub project pages serve
// at /<repo>/). Set NEXT_PUBLIC_BASE_PATH=/ghostroster in the GitHub Pages build;
// leave it unset for local dev and root hosts like Cloudflare Pages.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  // D-005: static export, no backend. Produces ./out for a free-tier static host.
  output: "export",
  // next/image optimization needs a server; static export ships raw images instead.
  images: { unoptimized: true },
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
