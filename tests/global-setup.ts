import { execSync } from "node:child_process";

// Runs once before the whole test suite — applies any pending migrations
// to the test database so it always matches prisma/schema.prisma, the same
// way a fresh dev database would after `prisma migrate deploy`.
export default function globalSetup() {
  // prisma.config.ts's migrate step reads DIRECT_URL, not DATABASE_URL
  // (see that file's comment on pooled vs. direct connections).
  execSync("npx prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      DIRECT_URL: process.env.TEST_DATABASE_URL,
    },
    stdio: "inherit",
  });
}
