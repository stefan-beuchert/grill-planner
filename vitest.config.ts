import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL is not set — tests need their own database so they " +
      "never touch dev data (see docker-compose.yml).",
  );
}

// Tests run against a real Postgres database (TEST_DATABASE_URL, separate
// from dev/prod), not a mocked Prisma client, so the contribution-ledger
// and auth-boundary tests exercise real query behavior, not a stand-in.
export default defineConfig({
  resolve: {
    // Mirrors tsconfig.json's "@/*" -> "./*" path alias — Vitest doesn't
    // read tsconfig paths on its own.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    env: {
      // lib/prisma.ts reads DATABASE_URL at import time — overriding it
      // here (rather than trusting the ambient dev value) is what keeps
      // tests from ever touching real party data.
      DATABASE_URL: TEST_DATABASE_URL,
    },
    globalSetup: "./tests/global-setup.ts",
    // Vitest's default include glob also matches Playwright's *.spec.ts
    // files (tests/e2e/**) — exclude that directory, it's a different
    // test runner entirely (`npm run test:e2e`).
    exclude: ["**/node_modules/**", "tests/e2e/**"],
    // These tests share one database and reset its state between files —
    // running files in parallel would race each other.
    fileParallelism: false,
  },
});
