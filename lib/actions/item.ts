"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorizeParticipant } from "@/lib/participant-auth";
import { itemNameSchema } from "@/lib/validations/item";
import { quantitySchema } from "@/lib/validations/quantity";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";
import type { ItemCategory, ItemListType } from "@/lib/generated/prisma/enums";

export async function addItem(
  slug: string,
  participantId: string,
  editToken: string,
  name: string,
  listType: ItemListType,
  category: ItemCategory | null,
) {
  const t = dictionaries[await getLocale()];

  const parsed = itemNameSchema(t).safeParse({ name });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.common.joinFirst };
  }

  try {
    const existing = await prisma.item.findUnique({
      where: {
        partyId_listType_name: {
          partyId: participant.partyId,
          listType,
          name: parsed.data.name,
        },
      },
    });
    if (existing) {
      return { success: false as const, error: t.common.itemAlreadyOnList };
    }

    // Nested write: creates the item and its first contribution in a single
    // round trip instead of two separate sequential creates.
    await prisma.item.create({
      data: {
        partyId: participant.partyId,
        listType,
        category: listType === "SHARED_PURCHASE" ? category : null,
        name: parsed.data.name,
        contributions: { create: { participantId, quantity: 1 } },
      },
    });
  } catch (err) {
    console.error("addItem failed", { slug, participantId, listType }, err);
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function setContribution(
  slug: string,
  participantId: string,
  editToken: string,
  itemId: string,
  quantity: number,
) {
  const t = dictionaries[await getLocale()];

  const parsedQuantity = quantitySchema.safeParse(quantity);
  if (!parsedQuantity.success) {
    return { success: false as const, error: t.common.invalidQuantity };
  }

  // Independent lookups — run concurrently instead of one-after-another.
  const [participant, item] = await Promise.all([
    authorizeParticipant(participantId, editToken),
    prisma.item.findUnique({ where: { id: itemId } }),
  ]);
  if (!participant) {
    return { success: false as const, error: t.common.onlyOwnSelections };
  }
  if (!item) {
    return { success: false as const, error: t.common.itemGone };
  }
  if (item.purchased) {
    return { success: false as const, error: t.common.itemLocked };
  }

  try {
    if (parsedQuantity.data === 0) {
      await prisma.contribution.deleteMany({ where: { itemId, participantId } });
    } else {
      await prisma.contribution.upsert({
        where: { itemId_participantId: { itemId, participantId } },
        create: { itemId, participantId, quantity: parsedQuantity.data },
        update: { quantity: parsedQuantity.data },
      });
    }

    const remaining = await prisma.contribution.count({ where: { itemId } });
    if (remaining === 0) {
      await prisma.item.delete({ where: { id: itemId } }).catch(() => {});
    }
  } catch (err) {
    console.error("setContribution failed", { slug, itemId, participantId }, err);
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function moveItem(
  slug: string,
  participantId: string,
  editToken: string,
  itemId: string,
  targetListType: ItemListType,
) {
  const t = dictionaries[await getLocale()];

  const [participant, item] = await Promise.all([
    authorizeParticipant(participantId, editToken),
    prisma.item.findUnique({ where: { id: itemId }, include: { contributions: true } }),
  ]);
  if (!participant) {
    return { success: false as const, error: t.common.onlyOwnSelections };
  }
  if (!item || item.listType === targetListType) {
    return { success: false as const, error: t.common.itemGone };
  }
  if (item.purchased) {
    return { success: false as const, error: t.common.itemLocked };
  }
  // Only someone who contributed to the item can move it — moving is scoped
  // to "your own items", same as editing a quantity.
  const isMine = item.contributions.some((c) => c.participantId === participantId);
  if (!isMine) {
    return { success: false as const, error: t.common.onlyOwnSelections };
  }

  try {
    const conflict = await prisma.item.findUnique({
      where: {
        partyId_listType_name: { partyId: item.partyId, listType: targetListType, name: item.name },
      },
    });
    if (conflict) {
      return { success: false as const, error: t.common.itemAlreadyOnList };
    }

    await prisma.item.update({
      where: { id: itemId },
      data: {
        listType: targetListType,
        category: targetListType === "SHARED_PURCHASE" ? "OTHER" : null,
      },
    });
  } catch (err) {
    console.error("moveItem failed", { slug, itemId, targetListType }, err);
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function setItemPurchased(
  slug: string,
  participantId: string,
  editToken: string,
  itemId: string,
  purchased: boolean,
) {
  const t = dictionaries[await getLocale()];

  const [participant, item] = await Promise.all([
    authorizeParticipant(participantId, editToken),
    prisma.item.findUnique({ where: { id: itemId } }),
  ]);
  if (!participant) {
    return { success: false as const, error: t.common.onlyOwnSelections };
  }
  if (!item || item.listType !== "SHARED_PURCHASE") {
    return { success: false as const, error: t.common.itemGone };
  }

  if (!purchased && item.purchasedByParticipantId !== participantId) {
    return { success: false as const, error: t.shoppingList.onlyPurchaserCanUnmark };
  }

  try {
    if (purchased) {
      await prisma.item.update({
        where: { id: itemId },
        data: { purchased: true, purchasedByParticipantId: participantId },
      });
    } else {
      await prisma.item.update({
        where: { id: itemId },
        data: { purchased: false, purchasedByParticipantId: null },
      });
    }
  } catch (err) {
    console.error("setItemPurchased failed", { slug, itemId, purchased }, err);
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}
