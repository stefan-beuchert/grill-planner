"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DrinkType } from "@/lib/generated/prisma/client";
import { authorizeParticipant } from "@/lib/participant-auth";
import { quantitySchema } from "@/lib/validations/quantity";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";

export async function setDrinkSelection(
  slug: string,
  participantId: string,
  editToken: string,
  type: DrinkType,
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
    await prisma.drinkSelection.deleteMany({ where: { participantId, type } });
  } else {
    await prisma.drinkSelection.upsert({
      where: { participantId_type: { participantId, type } },
      create: { participantId, type, quantity: parsedQuantity.data },
      update: { quantity: parsedQuantity.data },
    });
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}
