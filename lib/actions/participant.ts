"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorizeParticipant } from "@/lib/participant-auth";
import { participantNameSchema } from "@/lib/validations/participant";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";

export async function joinParty(slug: string, name: string) {
  const t = dictionaries[await getLocale()];

  const parsed = participantNameSchema(t).safeParse({ name });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const party = await prisma.party.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!party) {
    return { success: false as const, error: t.participants.partyGone };
  }

  let participant;
  try {
    participant = await prisma.participant.create({
      data: { partyId: party.id, name: parsed.data.name },
    });
  } catch (err) {
    console.error("joinParty failed", { slug }, err);
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);

  return {
    success: true as const,
    participantId: participant.id,
    editToken: participant.editToken,
  };
}

export async function updateParticipantName(
  slug: string,
  participantId: string,
  editToken: string,
  name: string,
) {
  const t = dictionaries[await getLocale()];

  const parsed = participantNameSchema(t).safeParse({ name });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.participants.onlyOwnEntry };
  }

  try {
    await prisma.participant.update({
      where: { id: participantId },
      data: { name: parsed.data.name },
    });
  } catch (err) {
    console.error("updateParticipantName failed", { slug, participantId }, err);
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);

  return { success: true as const };
}
