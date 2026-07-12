"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorizeParticipant } from "@/lib/participant-auth";
import { foodItemNameSchema } from "@/lib/validations/food";
import { quantitySchema } from "@/lib/validations/quantity";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";

export async function setFoodSelection(
  slug: string,
  participantId: string,
  editToken: string,
  foodItemId: string,
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
    await prisma.foodSelection.deleteMany({ where: { participantId, foodItemId } });
  } else {
    await prisma.foodSelection.upsert({
      where: { participantId_foodItemId: { participantId, foodItemId } },
      create: { participantId, foodItemId, quantity: parsedQuantity.data },
      update: { quantity: parsedQuantity.data },
    });
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function addFoodItem(
  slug: string,
  participantId: string,
  editToken: string,
  name: string,
) {
  const t = dictionaries[await getLocale()];

  const parsed = foodItemNameSchema(t).safeParse({ name });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.common.joinFirst };
  }

  const existing = await prisma.foodItem.findUnique({
    where: {
      partyId_name: { partyId: participant.partyId, name: parsed.data.name },
    },
  });
  if (existing) {
    return { success: false as const, error: t.food.alreadyOnList };
  }

  const foodItem = await prisma.foodItem.create({
    data: { partyId: participant.partyId, name: parsed.data.name },
  });
  await prisma.foodSelection.create({
    data: { participantId, foodItemId: foodItem.id, quantity: 1 },
  });

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}
