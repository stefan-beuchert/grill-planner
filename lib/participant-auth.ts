import { prisma } from "@/lib/prisma";

// Shared by every Server Action that lets a participant edit their own
// data (food, drinks, ride info, name) — confirms the caller's editToken
// actually matches the row in the database before any write happens.
export async function authorizeParticipant(participantId: string, editToken: string) {
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
  });
  if (!participant || participant.editToken !== editToken) {
    return null;
  }
  return participant;
}
