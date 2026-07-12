import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg / the Prisma driver adapter do dynamic requires that Next's bundler
  // shouldn't try to statically analyze — keep them as real Node deps at
  // runtime instead of bundling them.
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  // The dev-tools badge sits bottom-left, exactly over this app's bottom
  // tab bar (mobile-first, tabs pinned to the bottom) — it physically
  // blocks the leftmost tab while developing. Dev-only, no effect on prod.
  devIndicators: false,
};

export default nextConfig;
