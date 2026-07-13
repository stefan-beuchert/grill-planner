import { prisma } from "@/lib/prisma";

let counter = 0;
// Unique-enough per test run without pulling in a UUID/cuid dependency —
// these rows are thrown away by deleteTestParty, never read back by slug.
function uniqueSuffix() {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

export async function createTestParty(overrides: Partial<{ title: string }> = {}) {
  return prisma.party.create({
    data: {
      slug: `test-${uniqueSuffix()}`,
      title: overrides.title ?? "Test Party",
      startsAt: new Date("2026-08-01T18:00:00Z"),
      location: "Test Location",
    },
  });
}

export async function createTestParticipant(partyId: string, name = "Test Participant") {
  return prisma.participant.create({ data: { partyId, name } });
}

export async function deleteTestParty(partyId: string) {
  // Party.onDelete: Cascade on Participant/Item takes care of the rest.
  await prisma.party.delete({ where: { id: partyId } }).catch(() => {});
}
