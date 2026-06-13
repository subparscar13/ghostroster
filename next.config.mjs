/** @type {import('next').NextConfig} */
const nextConfig = {
  // D-005: static export, no backend. Produces ./out for a free-tier static host.
  output: "export",
  // next/image optimization needs a server; static export ships raw images instead.
  images: { unoptimized: true },
};

export default nextConfig;
