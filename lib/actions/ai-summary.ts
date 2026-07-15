"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { authorizeParticipant } from "@/lib/participant-auth";
import { geocodeLocation } from "@/lib/geocode";
import { getWeatherForecast } from "@/lib/weather";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { LANGUAGE_NAMES, SYSTEM_PROMPT, formatPartyContext } from "@/lib/ai-summary-context";
import { computeNetBalances, simplifyDebts, type SplitReceipt } from "@/lib/settlement";

const aiSummarySchema = z.object({
  recap: z.string(),
  openPoints: z.array(z.string()),
});

export async function generateAiSummary(
  slug: string,
  participantId: string,
  editToken: string,
) {
  const locale = await getLocale();
  const t = dictionaries[locale];

  const participant = await authorizeParticipant(participantId, editToken);
  if (!participant) {
    return { success: false as const, error: t.common.joinFirst };
  }

  const party = await prisma.party.findUnique({
    where: { id: participant.partyId },
    include: {
      participants: {
        select: { id: true, name: true, isDriver: true, seatsFree: true, needsRide: true },
        orderBy: { createdAt: "asc" },
      },
      items: {
        select: {
          name: true,
          listType: true,
          category: true,
          purchased: true,
          contributions: {
            select: { quantity: true, participant: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      receipts: {
        select: {
          store: true,
          paidByParticipantId: true,
          paidBy: { select: { name: true } },
          lineItems: {
            select: {
              priceCents: true,
              quantity: true,
              splits: { select: { participantId: true } },
            },
          },
        },
      },
    },
  });

  if (!party) {
    return { success: false as const, error: t.aiSummary.generationFailed };
  }

  const sharedItems = party.items.filter((i) => i.listType === "SHARED_PURCHASE");
  const bringItems = party.items.filter((i) => i.listType === "BRING_YOUR_OWN");

  const coords = await geocodeLocation(party.location);
  const weather = coords ? await getWeatherForecast(coords, party.startsAt) : null;
  const weatherLine = weather
    ? `${Math.round(weather.temperatureMin)}-${Math.round(weather.temperatureMax)}°C, ${weather.precipitationProbability}% chance of rain`
    : "not available";

  // Settlement is recomputed from data already fetched here — same pattern
  // as app/party/[slug]/page.tsx, nothing about who-owes-whom is stored.
  const participantIdsInOrder = party.participants.map((p) => p.id);
  const settlementReceipts: SplitReceipt[] = party.receipts.map((receipt) => ({
    paidByParticipantId: receipt.paidByParticipantId,
    lineItems: receipt.lineItems.map((lineItem) => ({
      lineTotalCents: lineItem.priceCents * lineItem.quantity,
      includedParticipantIds: lineItem.splits.map((s) => s.participantId),
    })),
  }));
  const participantNameById = new Map(party.participants.map((p) => [p.id, p.name]));
  const netBalances = computeNetBalances(participantIdsInOrder, settlementReceipts);
  const settlementTransactions = simplifyDebts(netBalances).map((transaction) => ({
    fromName: participantNameById.get(transaction.fromParticipantId) ?? "",
    toName: participantNameById.get(transaction.toParticipantId) ?? "",
    amountCents: transaction.amountCents,
  }));

  const receiptsForContext = party.receipts.map((receipt) => ({
    store: receipt.store ?? "unknown store",
    totalCents: receipt.lineItems.reduce(
      (sum, lineItem) => sum + lineItem.priceCents * lineItem.quantity,
      0,
    ),
    payerName: receipt.paidBy?.name ?? null,
  }));

  const context = formatPartyContext(
    party,
    weatherLine,
    party.participants,
    sharedItems,
    bringItems,
    receiptsForContext,
    settlementTransactions,
    locale,
  );

  try {
    const response = await anthropic.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT.replace("{{LANGUAGE}}", LANGUAGE_NAMES[locale]),
      messages: [{ role: "user", content: context }],
      output_config: { format: zodOutputFormat(aiSummarySchema) },
    });

    if (!response.parsed_output) {
      return { success: false as const, error: t.aiSummary.generationFailed };
    }

    await prisma.party.update({
      where: { id: party.id },
      data: {
        aiSummaryRecap: response.parsed_output.recap,
        aiSummaryOpenPoints: response.parsed_output.openPoints,
        aiSummaryGeneratedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("generateAiSummary failed", { slug, participantId }, err);
    return { success: false as const, error: t.aiSummary.generationFailed };
  }

  revalidatePath(`/party/${slug}`);
  return { success: true as const };
}
