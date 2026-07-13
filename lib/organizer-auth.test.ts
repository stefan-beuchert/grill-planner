import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { authorizeOrganizer, canManageParty } from "@/lib/organizer-auth";
import { createTestParty, deleteTestParty } from "@/tests/fixtures";

describe("authorizeOrganizer", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("returns the party when the organizer token matches", async () => {
    const party = await createTestParty();
    partyId = party.id;

    const result = await authorizeOrganizer(party.slug, party.organizerToken);

    expect(result?.id).toBe(party.id);
  });

  it("returns null when the organizer token doesn't match", async () => {
    const party = await createTestParty();
    partyId = party.id;

    const result = await authorizeOrganizer(party.slug, "wrong-token");

    expect(result).toBeNull();
  });
});

describe("canManageParty", () => {
  let partyId: string;
  const originalAdminPasscode = process.env.ADMIN_PASSCODE;

  beforeEach(() => {
    // isAdmin() short-circuits to false without touching cookies when this
    // is unset — lets us exercise the organizer-only path without needing
    // a Next.js request context to fake an admin cookie.
    delete process.env.ADMIN_PASSCODE;
  });

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
    process.env.ADMIN_PASSCODE = originalAdminPasscode;
  });

  it("is true for the party's own organizer token", async () => {
    const party = await createTestParty();
    partyId = party.id;

    expect(await canManageParty(party.slug, party.organizerToken)).toBe(true);
  });

  it("is false for a different party's organizer token", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const otherParty = await createTestParty();

    try {
      expect(await canManageParty(party.slug, otherParty.organizerToken)).toBe(false);
    } finally {
      await deleteTestParty(otherParty.id);
    }
  });

  it("is false with no token and no admin session", async () => {
    const party = await createTestParty();
    partyId = party.id;

    expect(await canManageParty(party.slug, undefined)).toBe(false);
  });
});
