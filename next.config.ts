import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Pin the project root so lockfiles in parent directories are not mistaken for a workspace root.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * This machine's private IPv4 addresses (e.g. 192.168.x.x). The dev server only
 * trusts localhost by default and blocks its HMR socket for other origins, which
 * leaves the page non-interactive when opened via the "Network" URL (for
 * example, from a phone). Only affects `next dev`.
 */
function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net !== undefined && net.family === "IPv4" && !net.internal)
    .map((net) => net!.address)
    .filter((ip) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip));
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses(),
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/sprites/**",
      },
    ],
    // Artwork rarely changes; let optimized variants live for a week.
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  turbopack: {
    root: projectRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
