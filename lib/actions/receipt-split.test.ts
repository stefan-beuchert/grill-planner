import { describe, it, expect, afterEach, vi } from "vitest";

// See lib/actions/item.test.ts for why these two modules need mocking —
// both require a live Next.js request context that doesn't exist here.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

const { setLineItemSplitInclusion, setReceiptPayer } = await import("@/lib/actions/receipt-split");
const { prisma } = await import("@/lib/prisma");
const { createTestParty, createTestParticipant, deleteTestParty } = await import("@/tests/fixtures");

async function createTestReceiptWithLineItem(
  partyId: string,
  includedParticipantIds: string[],
  scannedByParticipantId?: string,
) {
  const receipt = await prisma.receipt.create({
    data: { partyId, scannedByParticipantId, store: "Test Store" },
  });
  const lineItem = await prisma.receiptLineItem.create({
    data: {
      receiptId: receipt.id,
      name: "Chips",
      priceCents: 199,
      quantity: 1,
      position: 0,
      splits: {
        create: includedParticipantIds.map((participantId) => ({ participantId })),
      },
    },
  });
  return { receipt, lineItem };
}

async function splitParticipantIds(lineItemId: string) {
  const splits = await prisma.receiptLineItemSplit.findMany({ where: { lineItemId } });
  return splits.map((s) => s.participantId).sort();
}

describe("setLineItemSplitInclusion", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("excluding a participant deletes their split row, others untouched", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(party.id, "Bob");
    const { lineItem } = await createTestReceiptWithLineItem(party.id, [alice.id, bob.id]);

    const result = await setLineItemSplitInclusion(
      party.slug,
      alice.id,
      alice.editToken,
      lineItem.id,
      bob.id,
      false,
    );

    expect(result.success).toBe(true);
    expect(await splitParticipantIds(lineItem.id)).toEqual([alice.id]);
  });

  it("including a previously-excluded participant creates a row", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(party.id, "Bob");
    const { lineItem } = await createTestReceiptWithLineItem(party.id, [alice.id]);

    const result = await setLineItemSplitInclusion(
      party.slug,
      alice.id,
      alice.editToken,
      lineItem.id,
      bob.id,
      true,
    );

    expect(result.success).toBe(true);
    expect(await splitParticipantIds(lineItem.id)).toEqual([alice.id, bob.id].sort());
  });

  it("including an already-included participant is idempotent", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(party.id, "Bob");
    const { lineItem } = await createTestReceiptWithLineItem(party.id, [alice.id, bob.id]);

    const result = await setLineItemSplitInclusion(
      party.slug,
      alice.id,
      alice.editToken,
      lineItem.id,
      bob.id,
      true,
    );

    expect(result.success).toBe(true);
    expect(await splitParticipantIds(lineItem.id)).toEqual([alice.id, bob.id].sort());
  });

  it("rejects excluding the last remaining included participant", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const { lineItem } = await createTestReceiptWithLineItem(party.id, [alice.id]);

    const result = await setLineItemSplitInclusion(
      party.slug,
      alice.id,
      alice.editToken,
      lineItem.id,
      alice.id,
      false,
    );

    expect(result.success).toBe(false);
    expect(await splitParticipantIds(lineItem.id)).toEqual([alice.id]);
  });

  it("rejects a bad edit token for the caller", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(party.id, "Bob");
    const { lineItem } = await createTestReceiptWithLineItem(party.id, [alice.id, bob.id]);

    const result = await setLineItemSplitInclusion(
      party.slug,
      alice.id,
      "wrong-token",
      lineItem.id,
      bob.id,
      false,
    );

    expect(result.success).toBe(false);
  });

  it("rejects a line item belonging to a different party than the caller", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const otherParty = await createTestParty();
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(otherParty.id, "Bob");
    const { lineItem } = await createTestReceiptWithLineItem(otherParty.id, [bob.id]);

    const result = await setLineItemSplitInclusion(
      party.slug,
      alice.id,
      alice.editToken,
      lineItem.id,
      bob.id,
      false,
    );

    expect(result.success).toBe(false);
    await deleteTestParty(otherParty.id);
  });

  it("rejects a targetParticipantId belonging to a different party", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const otherParty = await createTestParty();
    const alice = await createTestParticipant(party.id, "Alice");
    const eve = await createTestParticipant(otherParty.id, "Eve");
    const { lineItem } = await createTestReceiptWithLineItem(party.id, [alice.id]);

    const result = await setLineItemSplitInclusion(
      party.slug,
      alice.id,
      alice.editToken,
      lineItem.id,
      eve.id,
      true,
    );

    expect(result.success).toBe(false);
    await deleteTestParty(otherParty.id);
  });

  it("lets the caller toggle a DIFFERENT participant's inclusion (not just their own)", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(party.id, "Bob");
    const carol = await createTestParticipant(party.id, "Carol");
    const { lineItem } = await createTestReceiptWithLineItem(party.id, [alice.id, bob.id, carol.id]);

    // Alice (caller) excludes Bob (a different participant).
    const result = await setLineItemSplitInclusion(
      party.slug,
      alice.id,
      alice.editToken,
      lineItem.id,
      bob.id,
      false,
    );

    expect(result.success).toBe(true);
    expect(await splitParticipantIds(lineItem.id)).toEqual([alice.id, carol.id].sort());
  });
});

describe("setReceiptPayer", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("sets a payer", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const { receipt } = await createTestReceiptWithLineItem(party.id, [alice.id]);

    const result = await setReceiptPayer(party.slug, alice.id, alice.editToken, receipt.id, alice.id);

    expect(result.success).toBe(true);
    const updated = await prisma.receipt.findUnique({ where: { id: receipt.id } });
    expect(updated?.paidByParticipantId).toBe(alice.id);
  });

  it("clears a payer (null)", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const { receipt } = await createTestReceiptWithLineItem(party.id, [alice.id]);
    await prisma.receipt.update({ where: { id: receipt.id }, data: { paidByParticipantId: alice.id } });

    const result = await setReceiptPayer(party.slug, alice.id, alice.editToken, receipt.id, null);

    expect(result.success).toBe(true);
    const updated = await prisma.receipt.findUnique({ where: { id: receipt.id } });
    expect(updated?.paidByParticipantId).toBeNull();
  });

  it("changes payer from one participant to another", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(party.id, "Bob");
    const { receipt } = await createTestReceiptWithLineItem(party.id, [alice.id, bob.id]);
    await prisma.receipt.update({ where: { id: receipt.id }, data: { paidByParticipantId: alice.id } });

    const result = await setReceiptPayer(party.slug, alice.id, alice.editToken, receipt.id, bob.id);

    expect(result.success).toBe(true);
    const updated = await prisma.receipt.findUnique({ where: { id: receipt.id } });
    expect(updated?.paidByParticipantId).toBe(bob.id);
  });

  it("rejects a bad edit token", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const { receipt } = await createTestReceiptWithLineItem(party.id, [alice.id]);

    const result = await setReceiptPayer(party.slug, alice.id, "wrong-token", receipt.id, alice.id);

    expect(result.success).toBe(false);
  });

  it("rejects a receipt belonging to a different party", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const otherParty = await createTestParty();
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(otherParty.id, "Bob");
    const { receipt } = await createTestReceiptWithLineItem(otherParty.id, [bob.id]);

    const result = await setReceiptPayer(party.slug, alice.id, alice.editToken, receipt.id, alice.id);

    expect(result.success).toBe(false);
    await deleteTestParty(otherParty.id);
  });

  it("rejects a payerParticipantId belonging to a different party", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const otherParty = await createTestParty();
    const alice = await createTestParticipant(party.id, "Alice");
    const eve = await createTestParticipant(otherParty.id, "Eve");
    const { receipt } = await createTestReceiptWithLineItem(party.id, [alice.id]);

    const result = await setReceiptPayer(party.slug, alice.id, alice.editToken, receipt.id, eve.id);

    expect(result.success).toBe(false);
    await deleteTestParty(otherParty.id);
  });

  it("lets the caller set someone ELSE as payer (not just themselves)", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(party.id, "Bob");
    const { receipt } = await createTestReceiptWithLineItem(party.id, [alice.id, bob.id]);

    const result = await setReceiptPayer(party.slug, alice.id, alice.editToken, receipt.id, bob.id);

    expect(result.success).toBe(true);
    const updated = await prisma.receipt.findUnique({ where: { id: receipt.id } });
    expect(updated?.paidByParticipantId).toBe(bob.id);
  });
});
