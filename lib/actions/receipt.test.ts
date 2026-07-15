import { describe, it, expect, afterEach, vi } from "vitest";

// See lib/actions/item.test.ts for why these two modules need mocking —
// both require a live Next.js request context that doesn't exist here.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

const { updateReceiptLineItem, deleteReceiptLineItem, addReceiptLineItem, deleteReceipt } =
  await import("@/lib/actions/receipt");
const { prisma } = await import("@/lib/prisma");
const { createTestParty, createTestParticipant, deleteTestParty } = await import(
  "@/tests/fixtures"
);

async function createTestReceipt(partyId: string, scannedByParticipantId?: string) {
  return prisma.receipt.create({
    data: { partyId, scannedByParticipantId, store: "Test Store" },
  });
}

describe("addReceiptLineItem", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("adds a line item to an existing receipt, positioned after existing items", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const receipt = await createTestReceipt(party.id, alice.id);
    await prisma.receiptLineItem.create({
      data: { receiptId: receipt.id, name: "Chips", priceCents: 199, quantity: 1, position: 0 },
    });

    const result = await addReceiptLineItem(
      party.slug,
      alice.id,
      alice.editToken,
      receipt.id,
      "Sausages",
      499,
      2,
    );

    expect(result.success).toBe(true);
    const lineItems = await prisma.receiptLineItem.findMany({
      where: { receiptId: receipt.id },
      orderBy: { position: "asc" },
    });
    expect(lineItems).toHaveLength(2);
    expect(lineItems[1]).toMatchObject({ name: "Sausages", priceCents: 499, quantity: 2, position: 1 });
  });

  it("creates a split row for every current participant on the new line item", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(party.id, "Bob");
    const receipt = await createTestReceipt(party.id, alice.id);

    const result = await addReceiptLineItem(
      party.slug,
      alice.id,
      alice.editToken,
      receipt.id,
      "Sausages",
      499,
      2,
    );

    expect(result.success).toBe(true);
    const lineItem = await prisma.receiptLineItem.findFirstOrThrow({
      where: { receiptId: receipt.id, name: "Sausages" },
    });
    const splits = await prisma.receiptLineItemSplit.findMany({
      where: { lineItemId: lineItem.id },
    });
    expect(splits).toHaveLength(2);
    expect(splits.map((s) => s.participantId).sort()).toEqual([alice.id, bob.id].sort());
  });

  it("rejects an edit token that doesn't belong to the participant", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const receipt = await createTestReceipt(party.id, alice.id);

    const result = await addReceiptLineItem(
      party.slug,
      alice.id,
      "wrong-token",
      receipt.id,
      "Sausages",
      499,
      2,
    );

    expect(result.success).toBe(false);
  });

  it("rejects invalid input (empty name)", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const receipt = await createTestReceipt(party.id, alice.id);

    const result = await addReceiptLineItem(party.slug, alice.id, alice.editToken, receipt.id, "  ", 100, 1);

    expect(result.success).toBe(false);
  });

  it("rejects a receipt belonging to a different party", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const otherParty = await createTestParty();
    const alice = await createTestParticipant(party.id, "Alice");
    const receipt = await createTestReceipt(otherParty.id);

    const result = await addReceiptLineItem(
      party.slug,
      alice.id,
      alice.editToken,
      receipt.id,
      "Sausages",
      499,
      2,
    );

    expect(result.success).toBe(false);
    await deleteTestParty(otherParty.id);
  });
});

describe("updateReceiptLineItem", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("updates name, price and quantity", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const receipt = await createTestReceipt(party.id, alice.id);
    const lineItem = await prisma.receiptLineItem.create({
      data: { receiptId: receipt.id, name: "Chips", priceCents: 199, quantity: 1, position: 0 },
    });

    const result = await updateReceiptLineItem(
      party.slug,
      alice.id,
      alice.editToken,
      lineItem.id,
      "Tortilla Chips",
      249,
      3,
    );

    expect(result.success).toBe(true);
    const updated = await prisma.receiptLineItem.findUnique({ where: { id: lineItem.id } });
    expect(updated).toMatchObject({ name: "Tortilla Chips", priceCents: 249, quantity: 3 });
  });

  it("rejects a negative price", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const receipt = await createTestReceipt(party.id, alice.id);
    const lineItem = await prisma.receiptLineItem.create({
      data: { receiptId: receipt.id, name: "Chips", priceCents: 199, quantity: 1, position: 0 },
    });

    const result = await updateReceiptLineItem(
      party.slug,
      alice.id,
      alice.editToken,
      lineItem.id,
      "Chips",
      -1,
      1,
    );

    expect(result.success).toBe(false);
  });

  it("rejects updating a line item that no longer exists", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");

    const result = await updateReceiptLineItem(
      party.slug,
      alice.id,
      alice.editToken,
      "nonexistent-id",
      "Chips",
      199,
      1,
    );

    expect(result.success).toBe(false);
  });

  it("rejects a participant from a different party", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const otherParty = await createTestParty();
    const bob = await createTestParticipant(otherParty.id, "Bob");
    const receipt = await createTestReceipt(party.id);
    const lineItem = await prisma.receiptLineItem.create({
      data: { receiptId: receipt.id, name: "Chips", priceCents: 199, quantity: 1, position: 0 },
    });

    const result = await updateReceiptLineItem(
      party.slug,
      bob.id,
      bob.editToken,
      lineItem.id,
      "Hacked Name",
      1,
      1,
    );

    expect(result.success).toBe(false);
    const unchanged = await prisma.receiptLineItem.findUnique({ where: { id: lineItem.id } });
    expect(unchanged).toMatchObject({ name: "Chips", priceCents: 199, quantity: 1 });
    await deleteTestParty(otherParty.id);
  });
});

describe("deleteReceiptLineItem", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("removes the line item", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const receipt = await createTestReceipt(party.id, alice.id);
    const lineItem = await prisma.receiptLineItem.create({
      data: { receiptId: receipt.id, name: "Chips", priceCents: 199, quantity: 1, position: 0 },
    });

    const result = await deleteReceiptLineItem(party.slug, alice.id, alice.editToken, lineItem.id);

    expect(result.success).toBe(true);
    const stillExists = await prisma.receiptLineItem.findUnique({ where: { id: lineItem.id } });
    expect(stillExists).toBeNull();
  });

  it("leaves the receipt itself intact after its last line item is removed", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const receipt = await createTestReceipt(party.id, alice.id);
    const lineItem = await prisma.receiptLineItem.create({
      data: { receiptId: receipt.id, name: "Chips", priceCents: 199, quantity: 1, position: 0 },
    });

    await deleteReceiptLineItem(party.slug, alice.id, alice.editToken, lineItem.id);

    const stillExists = await prisma.receipt.findUnique({ where: { id: receipt.id } });
    expect(stillExists).not.toBeNull();
  });

  it("rejects a participant from a different party", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const otherParty = await createTestParty();
    const bob = await createTestParticipant(otherParty.id, "Bob");
    const receipt = await createTestReceipt(party.id);
    const lineItem = await prisma.receiptLineItem.create({
      data: { receiptId: receipt.id, name: "Chips", priceCents: 199, quantity: 1, position: 0 },
    });

    const result = await deleteReceiptLineItem(party.slug, bob.id, bob.editToken, lineItem.id);

    expect(result.success).toBe(false);
    await deleteTestParty(otherParty.id);
  });
});

describe("deleteReceipt", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("deletes a receipt belonging to the participant's own party, cascading its line items", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const receipt = await createTestReceipt(party.id, alice.id);
    const lineItem = await prisma.receiptLineItem.create({
      data: { receiptId: receipt.id, name: "Chips", priceCents: 199, quantity: 1, position: 0 },
    });

    const result = await deleteReceipt(party.slug, alice.id, alice.editToken, receipt.id);

    expect(result.success).toBe(true);
    const stillExistsReceipt = await prisma.receipt.findUnique({ where: { id: receipt.id } });
    expect(stillExistsReceipt).toBeNull();
    const stillExistsLineItem = await prisma.receiptLineItem.findUnique({
      where: { id: lineItem.id },
    });
    expect(stillExistsLineItem).toBeNull();
  });

  it("rejects a participant from a different party", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const otherParty = await createTestParty();
    const bob = await createTestParticipant(otherParty.id, "Bob");
    const receipt = await createTestReceipt(party.id);

    const result = await deleteReceipt(party.slug, bob.id, bob.editToken, receipt.id);

    expect(result.success).toBe(false);
    const stillExists = await prisma.receipt.findUnique({ where: { id: receipt.id } });
    expect(stillExists).not.toBeNull();
    await deleteTestParty(otherParty.id);
  });
});
