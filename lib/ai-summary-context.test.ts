import { describe, it, expect } from "vitest";
import { formatPartyContext, SYSTEM_PROMPT } from "@/lib/ai-summary-context";
import { formatCents } from "@/lib/format-cents";

const emptyParty = {
  title: "Summer Grill",
  location: "123 Garden Ave",
  note: null,
  bringNote: null,
};

describe("formatPartyContext", () => {
  it("renders every placeholder line for an all-empty scenario", () => {
    const context = formatPartyContext(emptyParty, "not available", [], [], [], [], [], "en");

    expect(context).toContain("(no one has joined yet)");
    expect(context).toContain("(nothing yet)");
    expect(context).toContain("(no receipts scanned yet)");
    expect(context).toContain("(nothing to settle yet — no receipts scanned)");
  });

  it("labels a driver, a rider, and a guest with no ride info correctly", () => {
    const context = formatPartyContext(
      emptyParty,
      "not available",
      [
        { name: "Driver Dan", isDriver: true, seatsFree: 3, needsRide: false },
        { name: "Rider Rita", isDriver: false, seatsFree: null, needsRide: true },
        { name: "Neutral Nate", isDriver: false, seatsFree: null, needsRide: false },
      ],
      [],
      [],
      [],
      [],
      "en",
    );

    expect(context).toContain("- Driver Dan (driving, 3 free seat(s))");
    expect(context).toContain("- Rider Rita (needs a ride)");
    expect(context).toContain("- Neutral Nate (no ride info given)");
  });

  it("includes the party note and bringNote only when present", () => {
    const withNotes = formatPartyContext(
      { ...emptyParty, note: "no dessert please", bringNote: "bring your own chair" },
      "not available",
      [],
      [],
      [],
      [],
      [],
      "en",
    );
    expect(withNotes).toContain('Shopping List note: "no dessert please"');
    expect(withNotes).toContain('Things People Bring note: "bring your own chair"');

    const withoutNotes = formatPartyContext(emptyParty, "not available", [], [], [], [], [], "en");
    expect(withoutNotes).not.toContain("Shopping List note:");
    expect(withoutNotes).not.toContain("Things People Bring note:");
  });

  it("includes the reworded Shopping List and Things People Bring section headers verbatim", () => {
    const context = formatPartyContext(emptyParty, "not available", [], [], [], [], [], "en");

    expect(context).toContain(
      "Shopping List (shared-purchase pledges toward a total — a pledge is NOT a commitment to buy or bring; anyone can mark any item purchased):",
    );
    expect(context).toContain(
      "Things People Bring (each entry below IS that person's own commitment to bring it themselves):",
    );
  });

  it("renders a Shopping List item's total, purchased state, and contributor breakdown", () => {
    const context = formatPartyContext(
      emptyParty,
      "not available",
      [],
      [
        {
          name: "Tortillas",
          category: "FOOD",
          purchased: true,
          contributions: [
            { quantity: 2, participant: { name: "Anton" } },
            { quantity: 3, participant: { name: "Bea" } },
          ],
        },
      ],
      [],
      [],
      [],
      "en",
    );

    expect(context).toContain("- Tortillas: total 5 (purchased) [Anton 2, Bea 3]");
  });

  it("renders a Bring item's total and contributor breakdown", () => {
    const context = formatPartyContext(
      emptyParty,
      "not available",
      [],
      [],
      [
        {
          name: "Potato Salad",
          contributions: [{ quantity: 1, participant: { name: "Maria" } }],
        },
      ],
      [],
      [],
      "en",
    );

    expect(context).toContain("- Potato Salad: total 1 [Maria 1]");
  });

  it("renders a receipt with a payer as store + formatted total + payer name", () => {
    const context = formatPartyContext(
      emptyParty,
      "not available",
      [],
      [],
      [],
      [{ store: "Edeka", totalCents: 4250, payerName: "Anna" }],
      [],
      "en",
    );

    expect(context).toContain(`- Edeka: ${formatCents(4250, "en")}, paid by Anna`);
  });

  it("renders a receipt with no payer as 'no payer recorded yet'", () => {
    const context = formatPartyContext(
      emptyParty,
      "not available",
      [],
      [],
      [],
      [{ store: "Edeka", totalCents: 4250, payerName: null }],
      [],
      "en",
    );

    expect(context).toContain(`- Edeka: ${formatCents(4250, "en")}, paid by no payer recorded yet`);
  });

  it("says 'everyone is settled up' when receipts exist but there are no outstanding transactions", () => {
    const context = formatPartyContext(
      emptyParty,
      "not available",
      [],
      [],
      [],
      [{ store: "Edeka", totalCents: 4250, payerName: "Anna" }],
      [],
      "en",
    );

    expect(context).toContain("everyone is settled up, no outstanding balances");
  });

  it("renders a settlement transaction as 'X owes Y [formatted amount]'", () => {
    const context = formatPartyContext(
      emptyParty,
      "not available",
      [],
      [],
      [],
      [{ store: "Edeka", totalCents: 4250, payerName: "Anna" }],
      [{ fromName: "Tom", toName: "Anna", amountCents: 1250 }],
      "en",
    );

    expect(context).toContain(`- Tom owes Anna ${formatCents(1250, "en")}`);
  });

  it("formats currency per the given locale via formatCents, not a hardcoded symbol", () => {
    const contextDe = formatPartyContext(
      emptyParty,
      "not available",
      [],
      [],
      [],
      [{ store: "Edeka", totalCents: 1250, payerName: "Anna" }],
      [],
      "de",
    );
    const contextEn = formatPartyContext(
      emptyParty,
      "not available",
      [],
      [],
      [],
      [{ store: "Edeka", totalCents: 1250, payerName: "Anna" }],
      [],
      "en",
    );

    expect(contextDe).toContain(formatCents(1250, "de"));
    expect(contextEn).toContain(formatCents(1250, "en"));
    expect(formatCents(1250, "de")).not.toBe(formatCents(1250, "en"));
  });
});

// A tripwire, not a proof the model obeys the prompt — just guards against
// a future edit silently deleting one of these load-bearing sentences.
describe("SYSTEM_PROMPT regression guard", () => {
  it("still contains the Shopping List pledge-is-not-a-commitment rule", () => {
    expect(SYSTEM_PROMPT).toContain(
      "it is NOT an assignment of who has to go buy it",
    );
  });

  it("still contains the bringing-verb restriction with its wrong/right examples", () => {
    expect(SYSTEM_PROMPT).toContain(
      'reserve the verbs "is bringing" / "will bring" / "brings" strictly for Things People Bring items',
    );
    expect(SYSTEM_PROMPT).toContain('Wrong (Shopping List item): "Anton is bringing tortillas."');
    expect(SYSTEM_PROMPT).toContain('Right (Things People Bring item, for contrast): "Maria is bringing potato salad"');
  });

  it("still says the contributor-breakdown rule applies to both recap and openPoints", () => {
    expect(SYSTEM_PROMPT).toContain(
      "this applies equally to the recap and to openPoints",
    );
  });

  it("still frames an outstanding settlement balance as a neutral ledger fact", () => {
    expect(SYSTEM_PROMPT).toContain(
      'An outstanding settlement balance is a neutral ledger fact, not a failure to pay: phrase it like "Tom owes Anna €12.50," never "Tom still hasn\'t paid Anna."',
    );
  });

  it("still forbids inventing a financial open point when zero receipts are scanned", () => {
    expect(SYSTEM_PROMPT).toContain(
      "In that one case only, create no financial open point and do not mention receipts, payments, or splitting anywhere.",
    );
    expect(SYSTEM_PROMPT).toContain('Wrong (zero receipts scanned): "No receipts have been submitted yet."');
  });

  it("still mandates surfacing an outstanding settlement balance whenever one exists, with no exceptions", () => {
    expect(SYSTEM_PROMPT).toContain(
      'ALWAYS surface each one as its own open point — this is exactly as mandatory as ride balance or category coverage, never optional, never softened, never merged into the recap instead of listed as its own open point',
    );
  });
});
