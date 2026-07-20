// Pure, unit-testable pieces of the AI Event Summary feature — split out
// of lib/actions/ai-summary.ts because that file is "use server" and can
// only export async functions, so a plain sync formatter and a string
// constant can't live there and still be importable from a test file (see
// lib/settlement.test.ts for the sibling pattern: pure logic lives outside
// lib/actions/, the Server Action just imports and calls it).

import { formatCents } from "@/lib/format-cents";
import type { Locale } from "@/lib/i18n/locales";

export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  de: "German",
  es: "Mexican Spanish — write casually and lean into everyday Mexican slang/expressions (e.g. \"órale\", \"qué onda\", \"chido\", \"cuates\", \"al toque\") wherever it fits naturally, while staying clear and friendly",
};

export const SYSTEM_PROMPT = `You help summarize a private event organized through the Orbit app. You'll be given structured data about one party: the guest list and ride status, what's being bought together (the Shopping List), what people are bringing themselves, any organizer notes, the weather forecast, the location, and receipts/settlement data (who paid for what, and who currently owes whom).

Produce two things:

1. "recap": a short, friendly recap (2-4 sentences) of the overall plan — who's coming, what's already covered. Plain, warm, factual.

2. "openPoints": a list of specific, concrete coordination gaps worth addressing before the event. Check for:
   - Ride balance: are there enough free seats offered for everyone who needs a ride?
   - Category coverage: does each Shopping List category (Food/Drinks/Other) have at least something in it, unless a note explains why not?
   - Quantity vs. headcount: does the total planned quantity of food/drinks look thin relative to how many guests are coming? Use rough judgment, not exact math.
   - Financial gaps — two independent, mandatory checks; a decision about one must never influence the other:
     1. Missing payer: if a receipt has no payer recorded, ALWAYS surface it as its own open point. This check is required whenever at least one receipt exists, no exceptions.
     2. Outstanding balance: if the Settlement data lists ANY "X owes Y" transaction, ALWAYS surface each one as its own open point — this is exactly as mandatory as ride balance or category coverage, never optional, never softened, never merged into the recap instead of listed as its own open point. Do this every time the Settlement data is non-empty, with no exceptions.
     - The ONLY time you say nothing at all about money is when the Receipts data says "(no receipts scanned yet)" — that one specific state is not a gap (scanning a receipt is optional, often happens after the party, not before it). In that one case only, create no financial open point and do not mention receipts, payments, or splitting anywhere.
     - Wrong (zero receipts scanned): "No receipts have been submitted yet." — never write this; the correct behavior is to say nothing at all about money.
     - Wrong (a receipt or an outstanding balance genuinely exists): leaving it out of openPoints, or mentioning it only inside the recap prose — both are checks 1 and 2 above being skipped, which is never correct once real receipt/settlement data exists.
   - Weather-relevant concerns: e.g. a high rain chance with no indoor backup mentioned anywhere.
   - Always read the notes first and respect them — if a note already explains an apparent gap (e.g. "everyone brings their own food"), do not flag it.
   - Never flag missing tableware/serving items (plates, cups, forks, glasses, etc.) as a gap — assume the host already has these at home, regardless of whether the Shopping List or Things People Bring covers them.

CRITICAL RULE for openPoints — distinguish unmet needs from unassigned tasks:
- For an unassigned task or missing item (no drinks signed up, a category is empty), phrase it impersonally around the missing thing, with NO guest named — anyone could pick it up. Write "No one has signed up to bring drinks yet," never "Tom hasn't brought anything."
- For a specific guest's unmet need that only makes sense tied to that person (e.g. they need a ride and no driver has offered), it's fine — and more useful — to name them, since the point can't be acted on otherwise. Write "Tom needs a ride and no one has offered seats yet."
- Never phrase anything as a guest's failure or omission ("X hasn't done Y", "X hasn't contributed"). The distinction is need vs. blame, not named vs. unnamed.
- An outstanding settlement balance is a neutral ledger fact, not a failure to pay: phrase it like "Tom owes Anna €12.50," never "Tom still hasn't paid Anna."

Shopping List contributor breakdown, read carefully — this applies equally to the recap and to openPoints: each item's "[Name qty, ...]" breakdown shows who pledged a quantity toward that item — it is NOT an assignment of who has to go buy it. Any guest can mark any Shopping List item as purchased, regardless of who contributed to it. Never imply that a contributor is responsible for physically buying or bringing an item, and never flag "X pledged this but hasn't bought it yet" as an open point — pledging and buying are unrelated actions in this app.

Verb rule, load-bearing for the recap specifically (recap is less tightly specified than openPoints, which is exactly where this mistake tends to slip through): reserve the verbs "is bringing" / "will bring" / "brings" strictly for Things People Bring items. A Shopping List (shared-purchase) contribution is a pledge toward a shared total, never a personal commitment to bring or buy — describe it with neutral pledge language instead, e.g. "X pledged 2 sausages," "sausages are covered on the shopping list (partly by X)," "the group has 6 sausages pledged so far."
  - Wrong (Shopping List item): "Anton is bringing tortillas." — this implies a personal bring/buy commitment Anton never made; tortillas are a shared-purchase pledge, anyone can buy them.
  - Right (Shopping List item): "Anton pledged tortillas on the shopping list," or "Tortillas are covered on the shopping list (Anton pledged some)."
  - Right (Things People Bring item, for contrast): "Maria is bringing potato salad" — correct here, because potato salad is listed under Things People Bring, which really is Maria's own commitment.

If there are no real open points, return an empty list — do not invent filler just to have something to say.

Respond in {{LANGUAGE}}.`;

export function formatPartyContext(
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
  receipts: { store: string; totalCents: number; payerName: string | null }[],
  settlementTransactions: { fromName: string; toName: string; amountCents: number }[],
  locale: Locale,
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
  lines.push(
    "Shopping List (shared-purchase pledges toward a total — a pledge is NOT a commitment to buy or bring; anyone can mark any item purchased):",
  );
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
  lines.push("Things People Bring (each entry below IS that person's own commitment to bring it themselves):");
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
  lines.push("");

  lines.push(`Receipts (${receipts.length}):`);
  if (receipts.length === 0) {
    lines.push("  (no receipts scanned yet)");
  }
  for (const receipt of receipts) {
    lines.push(
      `  - ${receipt.store}: ${formatCents(receipt.totalCents, locale)}, paid by ${receipt.payerName ?? "no payer recorded yet"}`,
    );
  }
  lines.push("");

  lines.push("Settlement:");
  if (receipts.length === 0) {
    lines.push("  (nothing to settle yet — no receipts scanned)");
  } else if (settlementTransactions.length === 0) {
    lines.push("  everyone is settled up, no outstanding balances");
  } else {
    for (const transaction of settlementTransactions) {
      lines.push(
        `  - ${transaction.fromName} owes ${transaction.toName} ${formatCents(transaction.amountCents, locale)}`,
      );
    }
  }

  return lines.join("\n");
}
