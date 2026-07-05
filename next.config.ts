import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) loads its worker script from a path relative to
  // its own package directory at runtime. Bundling it with Turbopack/webpack
  // breaks that resolution (worker file goes missing from the server bundle
  // output), so it must run as a real, unbundled Node module instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
