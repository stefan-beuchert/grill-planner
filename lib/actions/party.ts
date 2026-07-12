"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";
import { combineDateAndTimeUtc } from "@/lib/party-datetime";
import { authorizeParticipant } from "@/lib/participant-auth";
import { partyFormSchema, type PartyFormValues } from "@/lib/validations/party";
import { partyNoteSchema } from "@/lib/validations/party-note";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";

const MAX_SLUG_ATTEMPTS = 5;

export async function createParty(values: PartyFormValues) {
  const locale = await getLocale();
  const t = dictionaries[locale];

  // Never trust client-side validation alone — re-validate on the server.
  const parsed = partyFormSchema(t).safeParse(values);
  if (!parsed.success) {
    return { success: false as const, error: t.createPartyForm.genericError };
  }

  const { title, date, time, location, notes } = parsed.data;
  const startsAt = combineDateAndTimeUtc(date, time);
  if (Number.isNaN(startsAt.getTime())) {
    return { success: false as const, error: t.createPartyForm.invalidDateTime };
  }

  let slug: string | undefined;
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const candidate = generateSlug();
    const existing = await prisma.party.findUnique({ where: { slug: candidate } });
    if (!existing) {
      slug = candidate;
      break;
    }
  }
  if (!slug) {
    return { success: false as const, error: t.createPartyForm.createFailed };
  }

  const party = await prisma.party.create({
    data: {
      slug,
      title,
      startsAt,
      location,
      notes: notes || null,
    },
  });

  redirect(`/party/${party.slug}`);
}

export async function setPartyNote(
  slug: string,
  participantId: string,
  editToken: string,
  note: string,
) {
  const t = dictionaries[await getLocale()];

  const parsed = partyNoteSchema.safeParse({ note });
  if (!parsed.success) {
    return { success: false as const, error: t.common.invalidNote };
  }

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.common.joinFirst };
  }

  await prisma.party.update({
    where: { id: participant.partyId },
    data: { note: parsed.data.note || null },
  });

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function setBringNote(
  slug: string,
  participantId: string,
  editToken: string,
  note: string,
) {
  const t = dictionaries[await getLocale()];

  const parsed = partyNoteSchema.safeParse({ note });
  if (!parsed.success) {
    return { success: false as const, error: t.common.invalidNote };
  }

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.common.joinFirst };
  }

  await prisma.party.update({
    where: { id: participant.partyId },
    data: { bringNote: parsed.data.note || null },
  });

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}
