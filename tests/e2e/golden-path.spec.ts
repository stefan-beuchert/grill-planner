import { test, expect } from "@playwright/test";
import { Client } from "pg";

// Plain `pg`, not the app's Prisma client — Playwright's test transform is
// CJS-oriented and can't load the generated Prisma client (ESM-only,
// uses import.meta), unlike Next's own bundler or Vitest.
async function deletePartyBySlug(slug: string) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('DELETE FROM parties WHERE slug = $1', [slug]);
  await client.end();
}

// Runs against the real dev server/database (docker-compose's `app` +
// `db` services) rather than the isolated TEST_DATABASE_URL Vitest uses —
// this is deliberately an end-to-end smoke test of the deployed app, not a
// unit test, so it cleans up the one party it creates instead of needing a
// separate database.
test("golden path: create a party, join, add a shared item, mark it purchased", async ({
  page,
}) => {
  let slug: string | undefined;

  try {
    await page.goto("/");
    await page.getByLabel("Name der Party").fill("E2E Smoke Test Party");
    await page.locator("#date").fill("2026-09-01");
    await page.locator("#time").fill("18:00");
    await page.getByLabel("Treffpunkt").fill("Berlin, Germany");
    await page.getByRole("button", { name: "Party erstellen" }).click();

    await page.waitForURL(/\/party\//);
    slug = page.url().split("/party/")[1];

    // Creator hasn't joined as a participant yet — same welcome gate every
    // first-time visitor sees.
    await page.getByText("Nur mal schauen, später beitreten").click();

    await page.getByPlaceholder("Dein Name").fill("E2E Tester");
    await page.getByRole("button", { name: "Beitreten" }).click();

    await page.getByText("Einkaufen", { exact: true }).click();
    await page.getByPlaceholder("Etwas hinzufügen ...").first().fill("E2E Chips");
    await page.getByRole("button", { name: "Hinzufügen", exact: true }).first().click();

    const row = page.locator("li", { hasText: "E2E Chips" });
    await expect(row).toBeVisible();

    // Mark it purchased (the icon-only toggle — first button in the row).
    await row.getByRole("button").first().click();
    await expect(row.getByText(/Gekauft von/)).toBeVisible();
  } finally {
    if (slug) {
      await deletePartyBySlug(slug).catch(() => {});
    }
  }
});
