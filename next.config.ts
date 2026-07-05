import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pin the workspace root — a stray lockfile higher up the disk would
  // otherwise make Turbopack guess the wrong directory
  turbopack: { root: __dirname },
  // native/worker-based packages that must not be bundled
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
  // pdfjs loads its worker dynamically — file tracing misses it without this
  outputFileTracingIncludes: {
    "/api/cron/fetch-fliers": ["./node_modules/pdfjs-dist/legacy/build/**"],
    "/api/fliers/[id]/process": ["./node_modules/pdfjs-dist/legacy/build/**"],
  },
};

export default nextConfig;
