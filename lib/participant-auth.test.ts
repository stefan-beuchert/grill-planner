import { describe, it, expect, afterEach } from "vitest";
import { authorizeParticipant } from "@/lib/participant-auth";
import { createTestParty, createTestParticipant, deleteTestParty } from "@/tests/fixtures";

describe("authorizeParticipant", () => {
  let partyId: string;

  afterEach(async () => {
    if (partyId) await deleteTestParty(partyId);
  });

  it("returns the participant when the edit token matches", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const participant = await createTestParticipant(party.id);

    const result = await authorizeParticipant(participant.id, participant.editToken);

    expect(result?.id).toBe(participant.id);
  });

  it("returns null when the edit token doesn't match — the core 'can only edit your own stuff' boundary", async () => {
    const party = await createTestParty();
    partyId = party.id;
    const participant = await createTestParticipant(party.id);

    const result = await authorizeParticipant(participant.id, "wrong-token");

    expect(result).toBeNull();
  });

  it("returns null for a participant that doesn't exist", async () => {
    const result = await authorizeParticipant("nonexistent-id", "any-token");
    expect(result).toBeNull();
  });
});
