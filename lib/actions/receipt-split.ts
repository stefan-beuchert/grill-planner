"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorizeParticipant } from "@/lib/participant-auth";
import {
  lineItemSplitIncludedSchema,
  receiptPayerSchema,
} from "@/lib/validations/receipt-split";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";

// Note on permission shape (deliberately different from setContribution's
// "edit only your own row"): the caller is authorized via
// authorizeParticipant, but `targetParticipantId` is looked up
// independently and only checked for same-party membership — never
// compared to the caller's own id. Anyone can toggle anyone's inclusion or
// set anyone as payer, matching the receipt tab's existing fully-open
// collaboration model (see ARCHITECTURE.md's Auth section).
export async function setLineItemSplitInclusion(
  slug: string,
  participantId: string,
  editToken: string,
  lineItemId: string,
  targetParticipantId: string,
  included: boolean,
) {
  const t = dictionaries[await getLocale()];

  const parsedIncluded = lineItemSplitIncludedSchema.safeParse(included);
  if (!parsedIncluded.success) {
    return { success: false as const, error: t.common.actionFailed };
  }

  const caller = await authorizeParticipant(participantId, editToken);
  if (!caller) {
    return { success: false as const, error: t.common.joinFirst };
  }

  try {
    const lineItem = await prisma.receiptLineItem.findUnique({
      where: { id: lineItemId },
      include: { receipt: true },
    });
    if (!lineItem || lineItem.receipt.partyId !== caller.partyId) {
      return { success: false as const, error: t.common.itemGone };
    }

    const targetParticipant = await prisma.participant.findUnique({
      where: { id: targetParticipantId },
    });
    if (!targetParticipant || targetParticipant.partyId !== caller.partyId) {
      return { success: false as const, error: t.receipt.participantGone };
    }

    if (parsedIncluded.data) {
      await prisma.receiptLineItemSplit.upsert({
        where: {
          lineItemId_participantId: { lineItemId, participantId: targetParticipantId },
        },
        create: { lineItemId, participantId: targetParticipantId },
        update: {},
      });
    } else {
      // Read-then-write race window is an accepted, documented trade-off
      // here (same precedent as addReceiptLineItem's position calc) — not
      // wrapped in a transaction/custom error class.
      const remainingOthers = await prisma.receiptLineItemSplit.count({
        where: { lineItemId, participantId: { not: targetParticipantId } },
      });
      if (remainingOthers === 0) {
        return { success: false as const, error: t.receipt.mustIncludeSomeone };
      }
      await prisma.receiptLineItemSplit.deleteMany({
        where: { lineItemId, participantId: targetParticipantId },
      });
    }
  } catch (err) {
    console.error(
      "setLineItemSplitInclusion failed",
      { slug, lineItemId, participantId, targetParticipantId },
      err,
    );
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function setReceiptPayer(
  slug: string,
  participantId: string,
  editToken: string,
  receiptId: string,
  payerParticipantId: string | null,
) {
  const t = dictionaries[await getLocale()];

  const parsed = receiptPayerSchema.safeParse({ participantId: payerParticipantId });
  if (!parsed.success) {
    return { success: false as const, error: t.common.actionFailed };
  }

  const caller = await authorizeParticipant(participantId, editToken);
  if (!caller) {
    return { success: false as const, error: t.common.joinFirst };
  }

  try {
    const receipt = await prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt || receipt.partyId !== caller.partyId) {
      return { success: false as const, error: t.common.itemGone };
    }

    if (parsed.data.participantId !== null) {
      const payer = await prisma.participant.findUnique({
        where: { id: parsed.data.participantId },
      });
      if (!payer || payer.partyId !== caller.partyId) {
        return { success: false as const, error: t.receipt.participantGone };
      }
    }

    await prisma.receipt.update({
      where: { id: receiptId },
      data: { paidByParticipantId: parsed.data.participantId },
    });
  } catch (err) {
    console.error("setReceiptPayer failed", { slug, receiptId, participantId }, err);
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}
