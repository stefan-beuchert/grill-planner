// Recreates a fixed demo party for local UI checks so there's always a
// realistic, ready-made party instead of creating one by hand every time.
// Safe to re-run: deletes any existing party at the same slug first.
//
// Usage: npm run db:seed (→ tsx prisma/seed.ts)

import { prisma } from "@/lib/prisma";

const SLUG = "demo";

async function main() {
  await prisma.party.delete({ where: { slug: SLUG } }).catch(() => {});

  const party = await prisma.party.create({
    data: {
      slug: SLUG,
      title: "Grillplaner Testparty",
      startsAt: new Date("2026-08-15T17:00:00Z"),
      location: "Volkspark Friedrichshain, Berlin",
      notes: "Bitte pünktlich kommen, der Grill wird um 17 Uhr angezündet.",
      locationNote: "Eingang an der Danziger Straße, wir sind auf der großen Wiese.",
      note: "Jeder zahlt anteilig mit, Bar oder PayPal.",
      bringNote: "Bitte eigenes Geschirr mitbringen, wir haben nicht genug für alle.",
    },
  });

  const [anna, ben, clara, david, emma] = await Promise.all([
    prisma.participant.create({
      data: { partyId: party.id, name: "Anna", isDriver: true, seatsFree: 3 },
    }),
    prisma.participant.create({
      data: { partyId: party.id, name: "Ben", needsRide: true },
    }),
    prisma.participant.create({ data: { partyId: party.id, name: "Clara" } }),
    prisma.participant.create({ data: { partyId: party.id, name: "David" } }),
    prisma.participant.create({ data: { partyId: party.id, name: "Emma" } }),
  ]);

  await Promise.all([
    // Shopping List — Food
    prisma.item.create({
      data: {
        partyId: party.id,
        listType: "SHARED_PURCHASE",
        category: "FOOD",
        name: "Steak",
        contributions: {
          create: [
            { participantId: anna.id, quantity: 4 },
            { participantId: ben.id, quantity: 2 },
          ],
        },
      },
    }),
    prisma.item.create({
      data: {
        partyId: party.id,
        listType: "SHARED_PURCHASE",
        category: "FOOD",
        name: "Bratwurst",
        purchased: true,
        purchasedByParticipantId: clara.id,
        contributions: { create: { participantId: clara.id, quantity: 6 } },
      },
    }),
    // Shopping List — Drinks
    prisma.item.create({
      data: {
        partyId: party.id,
        listType: "SHARED_PURCHASE",
        category: "DRINK",
        name: "Bier",
        contributions: { create: { participantId: david.id, quantity: 12 } },
      },
    }),
    prisma.item.create({
      data: {
        partyId: party.id,
        listType: "SHARED_PURCHASE",
        category: "DRINK",
        name: "Cola",
        contributions: {
          create: [
            { participantId: emma.id, quantity: 4 },
            { participantId: anna.id, quantity: 2 },
          ],
        },
      },
    }),
    // Shopping List — Other
    prisma.item.create({
      data: {
        partyId: party.id,
        listType: "SHARED_PURCHASE",
        category: "OTHER",
        name: "Kohle",
        purchased: true,
        purchasedByParticipantId: ben.id,
        contributions: { create: { participantId: ben.id, quantity: 1 } },
      },
    }),
    // Things People Bring
    prisma.item.create({
      data: {
        partyId: party.id,
        listType: "BRING_YOUR_OWN",
        name: "Salat",
        contributions: { create: { participantId: clara.id, quantity: 1 } },
      },
    }),
    prisma.item.create({
      data: {
        partyId: party.id,
        listType: "BRING_YOUR_OWN",
        name: "Eis",
        contributions: {
          create: [
            { participantId: david.id, quantity: 2 },
            { participantId: emma.id, quantity: 2 },
            { participantId: anna.id, quantity: 2 },
          ],
        },
      },
    }),
    prisma.item.create({
      data: {
        partyId: party.id,
        listType: "BRING_YOUR_OWN",
        name: "Lautsprecher",
        contributions: { create: { participantId: ben.id, quantity: 1 } },
      },
    }),
  ]);

  console.log(`Seeded demo party: http://localhost:3000/party/${party.slug}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
