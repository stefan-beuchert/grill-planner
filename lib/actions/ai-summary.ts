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
import type { Locale } from "@/lib/i18n/locales";

const aiSummarySchema = z.object({
  recap: z.string(),
  openPoints: z.array(z.string()),
});

const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  de: "German",
  es: "Mexican Spanish — write casually and lean into everyday Mexican slang/expressions (e.g. \"órale\", \"qué onda\", \"chido\", \"cuates\", \"al toque\") wherever it fits naturally, while staying clear and friendly",
};

const SYSTEM_PROMPT = `You help summarize a private BBQ/grill party organized through the Grill Planner app. You'll be given structured data about one party: the guest list and ride status, what's being bought together (the Shopping List), what people are bringing themselves, any organizer notes, the weather forecast, and the location.

Produce two things:

1. "recap": a short, friendly recap (2-4 sentences) of the overall plan — who's coming, what's already covered. Plain, warm, factual.

2. "openPoints": a list of specific, concrete coordination gaps worth addressing before the event. Check for:
   - Ride balance: are there enough free seats offered for everyone who needs a ride?
   - Category coverage: does each Shopping List category (Food/Drinks/Other) have at least something in it, unless a note explains why not?
   - Quantity vs. headcount: does the total planned quantity of food/drinks look thin relative to how many guests are coming? Use rough judgment, not exact math.
   - Missing common BBQ essentials (a grill, fuel/charcoal, plates/cups) — only flag these if nothing already covers them and no note explains the omission.
   - Weather-relevant concerns: e.g. a high rain chance with no indoor backup mentioned anywhere.
   - Always read the notes first and respect them — if a note already explains an apparent gap (e.g. "everyone grills their own meat"), do not flag it.

CRITICAL RULE for openPoints — distinguish unmet needs from unassigned tasks:
- For an unassigned task or missing item (nobody has brought a grill, no drinks signed up, a category is empty), phrase it impersonally around the missing thing, with NO guest named — anyone could pick it up. Write "No one has signed up to bring a grill yet," never "Tom hasn't brought anything."
- For a specific guest's unmet need that only makes sense tied to that person (e.g. they need a ride and no driver has offered), it's fine — and more useful — to name them, since the point can't be acted on otherwise. Write "Tom needs a ride and no one has offered seats yet."
- Never phrase anything as a guest's failure or omission ("X hasn't done Y", "X hasn't contributed"). The distinction is need vs. blame, not named vs. unnamed.

Shopping List contributor breakdown, read carefully: each item's "[Name qty, ...]" breakdown shows who pledged a quantity toward that item — it is NOT an assignment of who has to go buy it. Any guest can mark any Shopping List item as purchased, regardless of who contributed to it. Never imply that a contributor is responsible for physically buying or bringing an item, and never flag "X pledged this but hasn't bought it yet" as an open point — pledging and buying are unrelated actions in this app.

If there are no real open points, return an empty list — do not invent filler just to have something to say.

Respond in {{LANGUAGE}}.`;

function formatPartyContext(
  party: {
    title: string;
    location: string;
    note: string | null;
    bringNote: string | null;
  },
  weatherLine: string,
  participants: { name: string; isDriver: boolean; seatsFree: number | null; needsRide: boolean }[],
  sharedItems: {
    name: string;
    category: string | null;
    purchased: boolean;
    contributions: { quantity: number; participant: { name: string } }[];
  }[],
  bringItems: {
    name: string;
    contributions: { quantity: number; participant: { name: string } }[];
  }[],
): string {
  const lines: string[] = [];

  lines.push(`Party: ${party.title}`);
  lines.push(`Location: ${party.location}`);
  lines.push(`Weather forecast: ${weatherLine}`);
  lines.push("");

  lines.push(`Guests (${participants.length}):`);
  if (participants.length === 0) {
    lines.push("  (no one has joined yet)");
  }
  for (const p of participants) {
    const ride = p.isDriver
      ? `driving, ${p.seatsFree ?? 0} free seat(s)`
      : p.needsRide
        ? "needs a ride"
        : "no ride info given";
    lines.push(`- ${p.name} (${ride})`);
  }
  lines.push("");

  if (party.note) lines.push(`Shopping List note: "${party.note}"`);
  lines.push("Shopping List:");
  for (const category of ["FOOD", "DRINK", "OTHER"] as const) {
    const items = sharedItems.filter((i) => i.category === category);
    lines.push(`  ${category}:`);
    if (items.length === 0) {
      lines.push("    (nothing yet)");
      continue;
    }
    for (const item of items) {
      const total = item.contributions.reduce((sum, c) => sum + c.quantity, 0);
      const breakdown = item.contributions
        .map((c) => `${c.participant.name} ${c.quantity}`)
        .join(", ");
      lines.push(
        `    - ${item.name}: total ${total}${item.purchased ? " (purchased)" : ""} [${breakdown}]`,
      );
    }
  }
  lines.push("");

  if (party.bringNote) lines.push(`Things People Bring note: "${party.bringNote}"`);
  lines.push("Things People Bring:");
  if (bringItems.length === 0) {
    lines.push("  (nothing yet)");
  }
  for (const item of bringItems) {
    const total = item.contributions.reduce((sum, c) => sum + c.quantity, 0);
    const breakdown = item.contributions
      .map((c) => `${c.participant.name} ${c.quantity}`)
      .join(", ");
    lines.push(`  - ${item.name}: total ${total} [${breakdown}]`);
  }

  return lines.join("\n");
}

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
        select: { name: true, isDriver: true, seatsFree: true, needsRide: true },
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

  const context = formatPartyContext(
    party,
    weatherLine,
    party.participants,
    sharedItems,
    bringItems,
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
