import { describe, it, expect, afterEach, vi } from "vitest";

// These actions call getLocale() (next/headers cookies()) and
// revalidatePath() (next/cache) as a matter of course — both require a
// live Next.js request context that doesn't exist in a plain test run.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

const { setContribution, setItemPurchased, moveItem } = await import("@/lib/actions/item");
const { prisma } = await import("@/lib/prisma");
const { createTestParty, createTestParticipant, deleteTestParty } = await import(
  "@/tests/fixtures"
);

describe("setContribution — the contribution ledger", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("creates an item via the first contribution and sums multiple contributors", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(party.id, "Bob");

    const item = await prisma.item.create({
      data: { partyId: party.id, name: "Chips", listType: "SHARED_PURCHASE", category: "FOOD" },
    });

    await setContribution(party.slug, alice.id, alice.editToken, item.id, 2);
    await setContribution(party.slug, bob.id, bob.editToken, item.id, 3);

    const contributions = await prisma.contribution.findMany({ where: { itemId: item.id } });
    const total = contributions.reduce((sum, c) => sum + c.quantity, 0);
    expect(total).toBe(5);
  });

  it("deletes the item once the last contribution is removed (quantity 0)", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");

    const item = await prisma.item.create({
      data: { partyId: party.id, name: "Ice", listType: "BRING_YOUR_OWN" },
    });
    await setContribution(party.slug, alice.id, alice.editToken, item.id, 2);

    const result = await setContribution(party.slug, alice.id, alice.editToken, item.id, 0);

    expect(result.success).toBe(true);
    const stillExists = await prisma.item.findUnique({ where: { id: item.id } });
    expect(stillExists).toBeNull();
  });

  it("rejects an edit token that doesn't belong to the participant", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const item = await prisma.item.create({
      data: { partyId: party.id, name: "Chips", listType: "SHARED_PURCHASE", category: "FOOD" },
    });

    const result = await setContribution(party.slug, alice.id, "wrong-token", item.id, 2);

    expect(result.success).toBe(false);
  });

  it("rejects editing a contribution on a locked (purchased) item", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const item = await prisma.item.create({
      data: {
        partyId: party.id,
        name: "Chips",
        listType: "SHARED_PURCHASE",
        category: "FOOD",
        purchased: true,
        purchasedByParticipantId: alice.id,
      },
    });

    const result = await setContribution(party.slug, alice.id, alice.editToken, item.id, 5);

    expect(result.success).toBe(false);
  });
});

describe("setItemPurchased — the purchase lock", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("locks the item and records who purchased it", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const item = await prisma.item.create({
      data: { partyId: party.id, name: "Chips", listType: "SHARED_PURCHASE", category: "FOOD" },
    });

    await setItemPurchased(party.slug, alice.id, alice.editToken, item.id, true);

    const updated = await prisma.item.findUnique({ where: { id: item.id } });
    expect(updated?.purchased).toBe(true);
    expect(updated?.purchasedByParticipantId).toBe(alice.id);
  });

  it("only the purchaser can unmark it — not just any participant", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(party.id, "Bob");
    const item = await prisma.item.create({
      data: {
        partyId: party.id,
        name: "Chips",
        listType: "SHARED_PURCHASE",
        category: "FOOD",
        purchased: true,
        purchasedByParticipantId: alice.id,
      },
    });

    const bobResult = await setItemPurchased(party.slug, bob.id, bob.editToken, item.id, false);
    expect(bobResult.success).toBe(false);

    const aliceResult = await setItemPurchased(
      party.slug,
      alice.id,
      alice.editToken,
      item.id,
      false,
    );
    expect(aliceResult.success).toBe(true);
  });
});

describe("moveItem — moving between the two lists", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("lets a contributor move their own item to the other list", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const item = await prisma.item.create({
      data: {
        partyId: party.id,
        name: "Board Game",
        listType: "BRING_YOUR_OWN",
        contributions: { create: { participantId: alice.id, quantity: 1 } },
      },
    });

    const result = await moveItem(
      party.slug,
      alice.id,
      alice.editToken,
      item.id,
      "SHARED_PURCHASE",
    );

    expect(result.success).toBe(true);
    const updated = await prisma.item.findUnique({ where: { id: item.id } });
    expect(updated?.listType).toBe("SHARED_PURCHASE");
  });

  it("rejects moving an item the caller never contributed to", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(party.id, "Bob");
    const item = await prisma.item.create({
      data: {
        partyId: party.id,
        name: "Board Game",
        listType: "BRING_YOUR_OWN",
        contributions: { create: { participantId: alice.id, quantity: 1 } },
      },
    });

    const result = await moveItem(party.slug, bob.id, bob.editToken, item.id, "SHARED_PURCHASE");

    expect(result.success).toBe(false);
  });

  it("rejects moving a locked (purchased) item", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const item = await prisma.item.create({
      data: {
        partyId: party.id,
        name: "Chips",
        listType: "SHARED_PURCHASE",
        category: "FOOD",
        purchased: true,
        purchasedByParticipantId: alice.id,
        contributions: { create: { participantId: alice.id, quantity: 1 } },
      },
    });

    const result = await moveItem(
      party.slug,
      alice.id,
      alice.editToken,
      item.id,
      "BRING_YOUR_OWN",
    );

    expect(result.success).toBe(false);
  });
});
