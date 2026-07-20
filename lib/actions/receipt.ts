"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { authorizeParticipant } from "@/lib/participant-auth";
import { receiptLineItemSchema } from "@/lib/validations/receipt";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";

// Only what canvas.toDataURL can actually produce client-side, per this
// milestone's fixed capture -> resize -> re-encode-as-JPEG pipeline — kept
// narrower than the Anthropic SDK's own Base64ImageSource union on purpose.
type ReceiptImageMimeType = "image/jpeg" | "image/png" | "image/webp";

const receiptExtractionSchema = z.object({
  store: z.string().nullable(),
  items: z.array(
    z.object({
      name: z.string(),
      priceCents: z.number(),
      quantity: z.number(),
    }),
  ),
});

const SYSTEM_PROMPT = `You extract structured data from a photo of a grocery/shopping receipt for a private event-planning app. The photo may be low quality — glare, a faded thermal-printer receipt, an angled shot.

Return:
1. "store": the store/merchant name if it's legible anywhere on the receipt, otherwise null. Do not guess.
2. "items": one entry per purchased line item, in the order they appear on the receipt. For each:
   - "name": a short, human-readable product name (clean up obvious receipt abbreviations if the meaning is clear, otherwise keep as printed).
   - "priceCents": the item's total price in cents, as a positive integer (e.g. 2.49 EUR -> 249). This is the line's total, not a per-unit price.
   - "quantity": the quantity purchased, as a positive integer. Default to 1 if the receipt doesn't show a quantity for that line.

Skip lines that aren't purchased products (subtotal, tax, total, payment method, loyalty program text, coupons/discounts as their own line — fold a discount into the item's price if it's clearly tied to one item, otherwise omit it). If you genuinely cannot read a value, make your best reasonable estimate rather than leaving it out — every returned item must have a name, priceCents, and quantity.`;

export async function scanReceipt(
  slug: string,
  participantId: string,
  editToken: string,
  imageBase64: string,
  mimeType: ReceiptImageMimeType,
) {
  const t = dictionaries[await getLocale()];

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.common.joinFirst };
  }

  try {
    const response = await anthropic.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: imageBase64 },
            },
            { type: "text", text: "Extract this receipt." },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(receiptExtractionSchema) },
    });

    if (!response.parsed_output) {
      return { success: false as const, error: t.receipt.extractionFailed };
    }

    const { store, items } = response.parsed_output;

    // Every participant currently in the party gets a split row on each
    // new line item, so "split equally across everyone" is the default —
    // see prisma/schema.prisma's ReceiptLineItemSplit doc-comment. Like
    // Contribution, this is a snapshot at creation time: participants who
    // join later aren't retroactively added.
    const currentParticipants = await prisma.participant.findMany({
      where: { partyId: participant.partyId },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    // Extracted values come from a model reading a possibly low-quality
    // photo — validate/clamp each one through the same bounds manual edits
    // go through (receiptLineItemSchema) rather than a separate ad hoc
    // path, so a misread (e.g. a wildly wrong price) can't slip past the
    // limits enforced everywhere else. A single bad item is dropped (and
    // logged) rather than failing the whole scan.
    const lineItemSchema = receiptLineItemSchema(t);
    const validItems = items.flatMap((item) => {
      const parsed = lineItemSchema.safeParse({
        name: item.name.trim().slice(0, 60) || t.receipt.unknownItemName,
        priceCents: Math.round(item.priceCents),
        quantity: Math.round(item.quantity),
      });
      if (!parsed.success) {
        console.error(
          "scanReceipt: dropping invalid extracted line item",
          { slug, participantId, item },
          parsed.error.issues,
        );
        return [];
      }
      return [parsed.data];
    });

    await prisma.receipt.create({
      data: {
        partyId: participant.partyId,
        scannedByParticipantId: participantId,
        store: store || null,
        lineItems: {
          create: validItems.map((item, index) => ({
            name: item.name,
            priceCents: item.priceCents,
            quantity: item.quantity,
            position: index,
            splits: {
              create: currentParticipants.map((p) => ({ participantId: p.id })),
            },
          })),
        },
      },
    });
  } catch (err) {
    console.error("scanReceipt failed", { slug, participantId }, err);
    return { success: false as const, error: t.receipt.extractionFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function updateReceiptLineItem(
  slug: string,
  participantId: string,
  editToken: string,
  lineItemId: string,
  name: string,
  priceCents: number,
  quantity: number,
) {
  const t = dictionaries[await getLocale()];

  const parsed = receiptLineItemSchema(t).safeParse({ name, priceCents, quantity });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.common.joinFirst };
  }

  try {
    const lineItem = await prisma.receiptLineItem.findUnique({
      where: { id: lineItemId },
      include: { receipt: true },
    });
    if (!lineItem || lineItem.receipt.partyId !== participant.partyId) {
      return { success: false as const, error: t.common.itemGone };
    }

    await prisma.receiptLineItem.update({
      where: { id: lineItemId },
      data: {
        name: parsed.data.name,
        priceCents: parsed.data.priceCents,
        quantity: parsed.data.quantity,
      },
    });
  } catch (err) {
    console.error("updateReceiptLineItem failed", { slug, lineItemId, participantId }, err);
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function deleteReceiptLineItem(
  slug: string,
  participantId: string,
  editToken: string,
  lineItemId: string,
) {
  const t = dictionaries[await getLocale()];

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.common.joinFirst };
  }

  try {
    const lineItem = await prisma.receiptLineItem.findUnique({
      where: { id: lineItemId },
      include: { receipt: true },
    });
    if (!lineItem || lineItem.receipt.partyId !== participant.partyId) {
      return { success: false as const, error: t.common.itemGone };
    }

    await prisma.receiptLineItem.delete({ where: { id: lineItemId } });
  } catch (err) {
    console.error("deleteReceiptLineItem failed", { slug, lineItemId, participantId }, err);
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function addReceiptLineItem(
  slug: string,
  participantId: string,
  editToken: string,
  receiptId: string,
  name: string,
  priceCents: number,
  quantity: number,
) {
  const t = dictionaries[await getLocale()];

  const parsed = receiptLineItemSchema(t).safeParse({ name, priceCents, quantity });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.common.joinFirst };
  }

  try {
    const receipt = await prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt || receipt.partyId !== participant.partyId) {
      return { success: false as const, error: t.common.itemGone };
    }

    // Read-then-create isn't fully concurrency-safe (two near-simultaneous
    // adds could still race), but reading the current max position inside
    // the same transaction as the create narrows the window as far as is
    // reasonable for what's ultimately just display order.
    await prisma.$transaction(async (tx) => {
      const highest = await tx.receiptLineItem.aggregate({
        where: { receiptId },
        _max: { position: true },
      });
      // Same "everyone included by default" snapshot as scanReceipt's bulk
      // create — see prisma/schema.prisma's ReceiptLineItemSplit doc-comment.
      const currentParticipants = await tx.participant.findMany({
        where: { partyId: participant.partyId },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      await tx.receiptLineItem.create({
        data: {
          receiptId,
          name: parsed.data.name,
          priceCents: parsed.data.priceCents,
          quantity: parsed.data.quantity,
          position: (highest._max.position ?? -1) + 1,
          splits: {
            create: currentParticipants.map((p) => ({ participantId: p.id })),
          },
        },
      });
    });
  } catch (err) {
    console.error("addReceiptLineItem failed", { slug, receiptId, participantId }, err);
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}

export async function deleteReceipt(
  slug: string,
  participantId: string,
  editToken: string,
  receiptId: string,
) {
  const t = dictionaries[await getLocale()];

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.common.joinFirst };
  }

  try {
    const receipt = await prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt || receipt.partyId !== participant.partyId) {
      return { success: false as const, error: t.common.itemGone };
    }

    await prisma.receipt.delete({ where: { id: receiptId } });
  } catch (err) {
    console.error("deleteReceipt failed", { slug, receiptId, participantId }, err);
    return { success: false as const, error: t.common.actionFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}
