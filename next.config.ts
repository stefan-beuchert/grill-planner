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
  // Receipt Scanner (lib/actions/receipt.ts) sends a resized/re-encoded
  // photo as base64 in a Server Action call — the default 1mb body limit is
  // too small for that, even after the client-side downscale to ~1600px.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
