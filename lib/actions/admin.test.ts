import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

// See lib/actions/item.test.ts for why next/headers and next/cache need
// mocking. Unlike that file's stub, this one needs a real get/set/delete
// cookie store — adminLogin/adminLogout actually set and clear a cookie,
// and adminDeleteParty's admin-only path depends on reading it back.
const cookieStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));
// adminCancelParty redirects on success — real next/navigation redirect()
// requires a live request context and isn't relevant to what these tests
// check (the delete happened / was blocked), so it's a no-op here.
vi.mock("next/navigation", () => ({
  redirect: () => {},
}));

const {
  adminLogin,
  adminLogout,
  adminDeleteParty,
  adminUpdateParty,
  adminCancelParty,
  adminUnmarkPurchased,
  adminRemoveContribution,
  adminRemoveGuest,
} = await import("@/lib/actions/admin");
const { prisma } = await import("@/lib/prisma");
const { createTestParty, createTestParticipant, deleteTestParty } = await import(
  "@/tests/fixtures"
);

describe("adminUpdateParty", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  const values = {
    title: "Updated Title",
    date: "2026-09-01",
    time: "18:00",
    location: "Updated Location",
    notes: "",
  };

  it("updates party details with the correct organizer token", async () => {
    const party = await createTestParty();
    partyId = party.id;

    const result = await adminUpdateParty(party.slug, party.id, values, party.organizerToken);

    expect(result.success).toBe(true);
    const updated = await prisma.party.findUnique({ where: { id: party.id } });
    expect(updated?.title).toBe("Updated Title");
    expect(updated?.location).toBe("Updated Location");
  });

  it("rejects a wrong organizer token and leaves the party unchanged", async () => {
    const party = await createTestParty();
    partyId = party.id;

    const result = await adminUpdateParty(party.slug, party.id, values, "wrong-token");

    expect(result.success).toBe(false);
    const unchanged = await prisma.party.findUnique({ where: { id: party.id } });
    expect(unchanged?.title).toBe(party.title);
  });

  it("rejects invalid values even with the correct organizer token", async () => {
    const party = await createTestParty();
    partyId = party.id;

    const result = await adminUpdateParty(
      party.slug,
      party.id,
      { ...values, title: "" },
      party.organizerToken,
    );

    expect(result.success).toBe(false);
  });
});

describe("adminCancelParty", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("deletes the party with the correct organizer token", async () => {
    const party = await createTestParty();
    partyId = party.id;

    await adminCancelParty(party.slug, party.id, party.organizerToken);

    const gone = await prisma.party.findUnique({ where: { id: party.id } });
    expect(gone).toBeNull();
    partyId = ""; // already gone, nothing left for afterEach to clean up
  });

  it("rejects a wrong organizer token and leaves the party in place", async () => {
    const party = await createTestParty();
    partyId = party.id;

    const result = await adminCancelParty(party.slug, party.id, "wrong-token");

    expect(result?.success).toBe(false);
    const stillThere = await prisma.party.findUnique({ where: { id: party.id } });
    expect(stillThere).not.toBeNull();
  });
});

describe("adminUnmarkPurchased", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("unmarks a purchased item with the correct organizer token", async () => {
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

    const result = await adminUnmarkPurchased(party.slug, item.id, party.organizerToken);

    expect(result.success).toBe(true);
    const updated = await prisma.item.findUnique({ where: { id: item.id } });
    expect(updated?.purchased).toBe(false);
    expect(updated?.purchasedByParticipantId).toBeNull();
  });

  it("rejects a wrong organizer token and leaves the item locked", async () => {
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

    const result = await adminUnmarkPurchased(party.slug, item.id, "wrong-token");

    expect(result.success).toBe(false);
    const unchanged = await prisma.item.findUnique({ where: { id: item.id } });
    expect(unchanged?.purchased).toBe(true);
  });
});

describe("adminRemoveContribution", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("deletes the item once its last contribution is removed", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const item = await prisma.item.create({
      data: { partyId: party.id, name: "Chips", listType: "SHARED_PURCHASE", category: "FOOD" },
    });
    await prisma.contribution.create({ data: { itemId: item.id, participantId: alice.id, quantity: 2 } });

    const result = await adminRemoveContribution(party.slug, item.id, alice.id, party.organizerToken);

    expect(result.success).toBe(true);
    const gone = await prisma.item.findUnique({ where: { id: item.id } });
    expect(gone).toBeNull();
  });

  it("keeps the item when another contributor remains", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(party.id, "Bob");
    const item = await prisma.item.create({
      data: { partyId: party.id, name: "Chips", listType: "SHARED_PURCHASE", category: "FOOD" },
    });
    await prisma.contribution.create({ data: { itemId: item.id, participantId: alice.id, quantity: 2 } });
    await prisma.contribution.create({ data: { itemId: item.id, participantId: bob.id, quantity: 1 } });

    await adminRemoveContribution(party.slug, item.id, alice.id, party.organizerToken);

    const stillThere = await prisma.item.findUnique({ where: { id: item.id } });
    expect(stillThere).not.toBeNull();
    const remaining = await prisma.contribution.findMany({ where: { itemId: item.id } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].participantId).toBe(bob.id);
  });

  it("rejects a wrong organizer token", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const item = await prisma.item.create({
      data: { partyId: party.id, name: "Chips", listType: "SHARED_PURCHASE", category: "FOOD" },
    });
    await prisma.contribution.create({ data: { itemId: item.id, participantId: alice.id, quantity: 2 } });

    const result = await adminRemoveContribution(party.slug, item.id, alice.id, "wrong-token");

    expect(result.success).toBe(false);
    const stillThere = await prisma.contribution.findMany({ where: { itemId: item.id } });
    expect(stillThere).toHaveLength(1);
  });
});

describe("adminRemoveGuest", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("removes the guest and deletes items only they had contributed to", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const soleItem = await prisma.item.create({
      data: { partyId: party.id, name: "Ice", listType: "BRING_YOUR_OWN" },
    });
    await prisma.contribution.create({ data: { itemId: soleItem.id, participantId: alice.id, quantity: 1 } });

    const result = await adminRemoveGuest(party.slug, alice.id, party.organizerToken);

    expect(result.success).toBe(true);
    const goneParticipant = await prisma.participant.findUnique({ where: { id: alice.id } });
    expect(goneParticipant).toBeNull();
    const goneItem = await prisma.item.findUnique({ where: { id: soleItem.id } });
    expect(goneItem).toBeNull();
  });

  it("keeps a shared item alive when another participant still contributes to it", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");
    const bob = await createTestParticipant(party.id, "Bob");
    const sharedItem = await prisma.item.create({
      data: { partyId: party.id, name: "Chips", listType: "SHARED_PURCHASE", category: "FOOD" },
    });
    await prisma.contribution.create({ data: { itemId: sharedItem.id, participantId: alice.id, quantity: 1 } });
    await prisma.contribution.create({ data: { itemId: sharedItem.id, participantId: bob.id, quantity: 1 } });

    await adminRemoveGuest(party.slug, alice.id, party.organizerToken);

    const stillThere = await prisma.item.findUnique({ where: { id: sharedItem.id } });
    expect(stillThere).not.toBeNull();
  });

  it("rejects a wrong organizer token and leaves the guest in place", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const alice = await createTestParticipant(party.id, "Alice");

    const result = await adminRemoveGuest(party.slug, alice.id, "wrong-token");

    expect(result.success).toBe(false);
    const stillThere = await prisma.participant.findUnique({ where: { id: alice.id } });
    expect(stillThere).not.toBeNull();
  });
});

describe("adminDeleteParty — admin-passcode gate, not organizer-gated", () => {
  let partyId: string;
  const originalAdminPasscode = process.env.ADMIN_PASSCODE;

  beforeEach(() => {
    process.env.ADMIN_PASSCODE = "test-admin-passcode";
    cookieStore.clear();
  });

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
    process.env.ADMIN_PASSCODE = originalAdminPasscode;
  });

  it("rejects deletion with no admin session, even for an unrelated party", async () => {
    const party = await createTestParty();
    partyId = party.id;

    const result = await adminDeleteParty(party.id);

    expect(result.success).toBe(false);
    const stillThere = await prisma.party.findUnique({ where: { id: party.id } });
    expect(stillThere).not.toBeNull();
  });

  it("deletes any party once a real admin session is established via adminLogin", async () => {
    const party = await createTestParty();
    partyId = party.id;

    const loginResult = await adminLogin("test-admin-passcode");
    expect(loginResult.success).toBe(true);

    const result = await adminDeleteParty(party.id);

    expect(result.success).toBe(true);
    const gone = await prisma.party.findUnique({ where: { id: party.id } });
    expect(gone).toBeNull();
    partyId = "";

    await adminLogout();
  });
});
