import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg / the Prisma driver adapter do dynamic requires that Next's bundler
  // shouldn't try to statically analyze — keep them as real Node deps at
  // runtime instead of bundling them.
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
};

export default nextConfig;
