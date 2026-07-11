import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) loads its worker script from a path relative to
  // its own package directory at runtime. Bundling it with Turbopack/webpack
  // breaks that resolution (worker file goes missing from the server bundle
  // output), so it must run as a real, unbundled Node module instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  // Marking a package "external" (above) means Vercel's own file tracer
  // decides which of its files actually ship in the deployed serverless
  // function bundle. Its static analysis doesn't reliably follow the dynamic
  // `await import('pdf-parse')` calls in resumeParsing.ts, so on Vercel this
  // silently dropped most of pdf-parse/pdfjs-dist from the bundle (observed:
  // "Failed to load external module pdf-parse" at runtime, works fine when
  // running the full checkout locally). Force-include both packages in full.
  //
  // pdfjs-dist's legacy Node build also needs @napi-rs/canvas at runtime to
  // polyfill browser-only geometry APIs (DOMMatrix/ImageData/Path2D) it uses
  // internally even for plain text extraction — without it, extraction fails
  // with "ReferenceError: DOMMatrix is not defined". @napi-rs/canvas ships a
  // native binary per platform, so it must be traced in fully too.
  outputFileTracingIncludes: {
    "/candidates/new": [
      "./node_modules/pdf-parse/**/*",
      "./node_modules/pdfjs-dist/**/*",
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-*/**/*",
    ],
  },
  async headers() {
    // Baseline security headers on every response. The CSP is intentionally
    // pragmatic: it hardens against clickjacking (frame-ancestors), base-tag
    // and object injection, and forces same-origin connections, while leaving
    // script/style permissive enough for Next's inline runtime and Tailwind.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
