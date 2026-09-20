import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  // The repository root carries its own lockfile; trace from this app only.
  outputFileTracingRoot: path.join(__dirname),
  // Every page reads live data; the dev-only HMR fetch cache replays stale bodies across reloads.
  experimental: { serverComponentsHmrCache: false },
};

export default nextConfig;
