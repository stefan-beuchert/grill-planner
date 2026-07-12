"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorizeParticipant } from "@/lib/participant-auth";
import { drinkItemNameSchema } from "@/lib/validations/drink";
import { quantitySchema } from "@/lib/validations/quantity";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";

export async function setDrinkSelection(
  slug: string,
  participantId: string,
  editToken: string,
  drinkItemId: string,
  quantity: number,
) {
  const t = dictionaries[await getLocale()];

  const parsedQuantity = quantitySchema.safeParse(quantity);
  if (!parsedQuantity.success) {
    return { success: false as const, error: t.common.invalidQuantity };
  }

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.common.onlyOwnSelections };
  }

  if (parsedQuantity.data === 0) {
    await prisma.drinkSelection.deleteMany({ where: { participantId, drinkItemId } });
  } else {
    await prisma.drinkSelection.upsert({
      where: { participantId_drinkItemId: { participantId, drinkItemId } },
      create: { participantId, drinkItemId, quantity: parsedQuantity.data },
      update: { quantity: parsedQuantity.data },
    });
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function addDrinkItem(
  slug: string,
  participantId: string,
  editToken: string,
  name: string,
) {
  const t = dictionaries[await getLocale()];

  const parsed = drinkItemNameSchema(t).safeParse({ name });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.common.joinFirst };
  }

  const existing = await prisma.drinkItem.findUnique({
    where: {
      partyId_name: { partyId: participant.partyId, name: parsed.data.name },
    },
  });
  if (existing) {
    return { success: false as const, error: t.drinks.alreadyOnList };
  }

  const drinkItem = await prisma.drinkItem.create({
    data: { partyId: participant.partyId, name: parsed.data.name },
  });
  await prisma.drinkSelection.create({
    data: { participantId, drinkItemId: drinkItem.id, quantity: 1 },
  });

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}
