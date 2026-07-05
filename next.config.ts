import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) loads its worker script from a path relative to
  // its own package directory at runtime. Bundling it with Turbopack/webpack
  // breaks that resolution (worker file goes missing from the server bundle
  // output), so it must run as a real, unbundled Node module instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // Marking a package "external" (above) means Vercel's own file tracer
  // decides which of its files actually ship in the deployed serverless
  // function bundle. Its static analysis doesn't reliably follow the dynamic
  // `await import('pdf-parse')` calls in resumeParsing.ts, so on Vercel this
  // silently dropped most of pdf-parse/pdfjs-dist from the bundle (observed:
  // "Failed to load external module pdf-parse" at runtime, works fine when
  // running the full checkout locally). Force-include both packages in full.
  outputFileTracingIncludes: {
    "/candidates/new": ["./node_modules/pdf-parse/**/*", "./node_modules/pdfjs-dist/**/*"],
  },
};

export default nextConfig;
