import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pin the workspace root — a stray lockfile higher up the disk would
  // otherwise make Turbopack guess the wrong directory
  turbopack: { root: __dirname },
};

export default nextConfig;
