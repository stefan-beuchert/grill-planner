# Grill Planner — Product Vision (v6 shipped)

Version 1 taught us something the original spec didn't anticipate: a BBQ has
two fundamentally different kinds of "stuff" — things the group needs to buy
together, and things people just bring from home. v2 makes that distinction
explicit and rebuilds Purchases/Drinks/Food around it.

## Product Principles

- The Grill Planner is designed for organizing one-time BBQ events with up
  to 20 participants. This is a rough design target, not a hard-coded or
  enforced limit.
- The application is optimized for mobile usage.
- Users should never need to scroll through long pages.
- Each tab groups one closely related set of planning tasks (e.g. Location
  bundles weather + map + driver coordination; Shopping List bundles
  Food/Drinks/Other) — not necessarily one single atomic task.
- The interface should be simple enough that someone can understand it
  without explanation.

---

## Navigation

Five tabs (v4 had merged Shared Purchases and Shopping List — two
near-identical views of the same items — down to one, landing at four;
v6 adds **Receipt** back to five, as a genuinely new post-party phase
rather than a reason to reconsider that merge):

1. **Guests** — participant list
2. **Shopping List** — Food / Drinks / Other (collapsible sections), each
   item showing its contributor breakdown *and* purchased/locked state in
   one place
3. **Things People Bring**
4. **Receipt** — scan and review post-party receipts (see "Receipt
   Scanner" below)
5. **Location** — weather + map + car sharing / driver coordination

A persistent **party identity bar** stays visible above all five tabs:
party title + date. It exists purely to stop the app from feeling generic
when switching tabs — every page should immediately confirm which party
you're looking at.

---

## Core Concept: The Contribution Ledger

This is the shared mechanic behind both the Shopping List and Things People
Bring, so it's worth defining once.

- An **item** is a shared bucket with a name and a category (e.g. "Sausage" /
  Food). It has no owner — whoever adds it first gets no special rights over
  it.
- Any participant can **contribute** a quantity to an item (e.g. Stefan adds
  2 sausages). Their name and amount appear next to the item, so it's always
  transparent who asked for what.
- A participant can only edit or remove **their own** contribution, never
  someone else's.
- The item's displayed quantity is the **sum of all contributions**.
- When the last contribution is removed and the total hits 0, the item is
  automatically removed from the list.
- If two people add items with slightly different names (e.g. "Sausage" vs
  "Sausages"), they are treated as different items in v2. No fuzzy matching.
- An item can't be created with a quantity of 0 — a contribution is always a
  positive amount. This is also what makes the auto-delete-at-0 rule safe:
  an item only ever exists while at least one real contribution backs it.

---

## Shopping List

The Shopping List is where everything that needs to be bought collectively
lives, using the Contribution Ledger above. (v2/v3 split this across two
tabs — "Shared Purchases" for the contributor breakdown, "Shopping List" for
the buy-it aggregation. v4 merges them: the two views were of the same
items, and having both no longer earned the extra tab.)

It is divided into:

- Food
- Drinks
- Other

Each section is collapsible.

Items display:

- name
- total quantity
- breakdown of contributors and their amounts
- purchased/locked state, with a **mark purchased** action per item

Only these items generate Shopping List entries — Things People Bring never
does.

- Any participant can mark an item as **purchased**.
- Marking an item purchased **locks** it: no one can add, edit, or remove
  contributions for that item while it's locked.
- Once purchased, the item shows the **purchaser's name** next to it — so
  it's clear who to ask if something's missing or wrong.
- Only the participant who marked an item purchased can **unmark** it.
  Nobody else can undo someone else's purchase — except via Admin Mode.

Each party has one optional, freely-editable **note** attached to this tab —
plain text, set by whoever, visible to everyone. This exists for context
that changes what "shared" even means for that party, e.g. "we're each
grilling our own meat this time, only chip in for drinks/bread/sauces." It's
informational only; it doesn't restrict what categories or items can be
added.

## Things People Bring

Participants can register things they're bringing themselves, using the
same Contribution Ledger mechanic as the Shopping List — including pooling
(e.g. three people can each pledge "2 bags of ice," so the group sees "6
bags of ice covered" without anyone shopping for it).

Examples:

- Potato Salad
- Dessert
- Bluetooth Speaker
- Ice

Differences from the Shopping List:

- These items **never** show up on the Shopping List.
- There is no "purchased" state — nothing here is bought as a group, so
  there's nothing to lock.

Like the Shopping List, this tab has its own optional, freely-editable note
(separate from the Shopping List one, since the two are different
coordination contexts) — e.g. "please bring your own plates and cups."

---

## Admin Mode & Party Organizers

**v5** replaces the pure single-passcode model with two layers: whoever
*creates* a party is automatically its **organizer**, with the same
correction/cleanup powers over that one party that used to require the
app-wide passcode. The passcode still exists as a **global admin** layer on
top, for cross-party maintenance.

**Party Organizer** (automatic, no passcode): the device that created a
party can, for that party only —

- **Edit party details** (title, date, time, location, notes) or **cancel**
  the party.
- **Unmark any purchased item**, even one purchased by someone else — the
  correction for a stuck/locked item.
- **Edit or remove any contribution** on the Shopping List or Things People
  Bring, even one added by someone else — the fix for a wrong, orphaned, or
  unreachable contributor's pledge (e.g. someone drops out but can't update
  what they said they'd bring).
- **Remove any guest** from the party — e.g. a duplicate entry, or someone
  who was added by mistake.

This is tied to the browser that created the party, not an account — if
that browser's storage is cleared, organizer access to that party is lost
(there's no recovery flow yet; the global admin passcode is the fallback).
Parties created before v5 have no organizer holder and remain
admin-only-manageable.

**Global Admin** (a single 4-digit passcode, set once by the app owner, not
per-party) unlocks everything a party organizer can do, for *every* party,
plus two things no organizer can do:

- See an **overview of every party** that exists in the app (title, date,
  participant count), with the ability to **delete** any of them. This is
  how test parties and abandoned ones get cleaned up.
- Manage a party whose organizer access was lost (cleared storage,
  pre-v5 party, etc).

Everything else stays open exactly as described above: any participant can
still add themselves as a guest, contribute to the Shopping List or Things
People Bring, and mark Shopping List items purchased, without needing
organizer or admin access. Both layers exist purely as a
correction/cleanup layer on top of that open model, not a gate on normal
use.

**Known trade-offs:**

- Organizer access has no recovery mechanism — losing it (cleared browser
  storage, different device) means falling back to the admin passcode.
  Acceptable for a small trusted-friends tool where the app owner is
  reachable; would need a recovery flow (e.g. a magic link) if organizers
  are ever people the app owner can't personally help.
- A 4-digit admin passcode is a small keyspace (10,000 combinations)
  guarding delete-everything-across-every-party power, with no rate
  limiting. The v5 organizer model removes most of the day-to-day pressure
  on this passcode (most corrections no longer need it at all), but the
  passcode itself is unchanged — would still need strengthening (longer
  code, rate limiting) if the app were ever opened up beyond people you
  know.

---

## Carried Over From v1 (unchanged)

No new learnings here yet — restated for completeness, not redesigned this
round.

- **Party** — title, date, time, meeting location, optional notes, unique
  shareable URL, no registration.
- **Guests** — enter name, join, edit own info.
- **Driver Coordination** — driving / available seats / needs a ride.
- **Weather** — forecast, temperature, rain probability for the party date.
- **Maps** — embedded map of the meeting location.

---

## AI Event Summary (shipped in v3)

**Purpose.** This isn't a dashboard feature — it's a specific bet on a group
dynamic. In group chats, obvious open points ("nobody's bringing a grill")
often go unaddressed even though everyone can see them, because raising it
means becoming "the organizer" or "the nag." The hope is that a neutral,
machine-generated observation removes that social cost — nobody has to be
the bad guy who assigns tasks or does everything themselves out of
everyone else's passivity. This is explicitly a hypothesis, not a proven
mechanism — worth shipping minimally and watching whether it actually
changes behavior at a real event before investing further.

**Where:** Guests tab, above the guest list — not a new tab. The app
already sits at 5 tabs and PRODUCT.md's own principles argue against
growing that count for something that isn't a distinct planning task.

**Trigger and caching:** a manual "Generate" / "Refresh" button, not
automatic generation on tab view. The result is cached — new `Party`
fields `aiSummary` (text) and `aiSummaryGeneratedAt` (timestamp) — and
shown with a "generated X ago" indicator. Regenerating is a conscious
action by whoever taps it, available to any participant, same as every
other open-collaboration action in this app.

**Model:** `claude-haiku-4-5`, called server-side from a Server Action,
non-streaming (output is short). Cheapest tier; upgrading to a stronger
model later is a one-line change if judgment quality disappoints in
practice.

**Inputs:** guest list + ride status, Shopping List items (category, total,
contributors, purchased state), Things People Bring items, both party
notes, weather forecast, location, party title/date.

**Output shape:** two parts —

1. A short general recap of the plan (who's coming, what's covered).
2. A distinct **"Open Points"** section — the actual point of the
   feature. Each item is phrased around the missing *thing*, never around
   who hasn't acted: "No one has signed up to bring a grill yet," not
   "Tom hasn't brought anything." This is load-bearing for the whole
   premise — naming a person reintroduces exactly the finger-pointing
   dynamic the feature exists to avoid, so contributor data may inform the
   model's judgment but must never surface as blame in the output.

**Sharing:** a **Copy button specifically on the Open Points section**, so
whoever generates it can paste it directly into the group chat (WhatsApp,
etc.) — which is where the actual coordination silence happens, not inside
this app. Without this, the neutral phrasing only helps once someone
manually retypes it elsewhere anyway; the copy button is what actually
closes the loop back to where the problem lives.

**Known trade-offs, documented not solved:**

- Guest names, contribution data, and location get sent to a third-party
  LLM API. Low-stakes for a small friends app, but a conscious choice, not
  an oversight.
- No prompt-injection hardening against mischievous item/guest names (e.g.
  someone naming a food item something adversarial). Acceptable given this
  is read-only and triggers no actions — worst case is a weird sentence in
  the output, not a security issue.
- The core hypothesis is unvalidated: whether a neutral AI-phrased gap
  actually gets addressed where a human-phrased one wouldn't have. Some
  groups may ignore any reminder regardless of source. Ship small, watch a
  real event, adjust before building further on top of this.

**Planned refinements (not yet built):**

- **Financial awareness**, once Receipt Scanner Milestone 2 (splitting)
  exists — the summary should be able to surface money-related open
  points too (e.g. receipts scanned but not yet split, or someone still
  owing money), the same way it currently surfaces ride/shopping gaps.

---

## Receipt Scanner — Milestone 1 of Cost Splitting (shipped in v6)

**Purpose.** CLAUDE.md's Future Features backlog lists "Cost splitting" —
this is the deliberate first milestone toward it, scoped narrowly on
purpose: capture a photo of a receipt, extract it into an editable
itemized list, and let anyone correct it by hand. **No splitting logic
exists yet** — no per-participant assignment, no equal-split math, no
"who owes what." That's Milestone 2, described below, not forgotten scope.

**Where:** a new **Rechnung** (Receipt) tab — the fourth tab, before
Location. Justified as a genuinely new tab (rather than folded into an
existing one, per this doc's own principle against tab sprawl) because
it's a different *phase* of the party from every existing tab: everything
else is before/during planning, this is strictly after — nobody has a
receipt to scan until the shopping trip already happened.

**Capture:** a plain `<input type="file" capture="environment">` — no
camera library. On mobile this opens the device camera directly; on
desktop it falls back to a normal file picker. The photo is resized and
re-encoded to JPEG client-side (canvas, ~1600px max width, ~0.7 quality)
before it's sent anywhere, both to keep the upload small on a mobile
connection and because there's no reason to send a multi-megapixel
original for something only read once by a model.

**Extraction:** same pattern as the AI Event Summary — a Server Action
(`scanReceipt`) calls `claude-haiku-4-5` server-side, this time with an
image content block instead of text, asking for a store name and a list
of line items (name, price, quantity). **The photo itself is never
persisted** — no object storage, no retention question to answer, because
there's nothing kept past the single extraction request. Only the
AI-extracted structured data is written to Postgres (`Receipt` +
`ReceiptLineItem`).

**Extraction is expected to be imperfect** — glare, faded thermal-printer
ink, an angled photo, a receipt with per-item discounts the model
misattributes. The result is presented as an **editable draft, not a final
answer**: every field of every line item (name, price, quantity) can be
edited inline, individual items can be deleted, and items can be added by
hand — covering both "the AI got this one wrong" and "the AI missed this
one entirely."

**Money as integer cents**, not a float, matching this schema's existing
`Int` quantity fields — avoids floating-point rounding errors when totals
get summed and (eventually) split.

**Multiple receipts per party**, not a single-receipt constraint — a
shopping trip commonly spans more than one store, and nothing stops
several participants from each buying separate parts of the list.

**Permissions:** open to any joined participant, same as every other
open-collaboration action in this app (add/edit/delete any line item,
delete any receipt) — no per-receipt ownership or lock concept for this
milestone. Consistent with how the Contribution Ledger already treats
"anyone can correct anything" as the default, not the exception.

**Known trade-offs, documented not solved:**

- No bill-splitting math yet — this milestone is capture + review only.
  **Milestone 2** (the deliberate next step, not deferred indefinitely) is:
  equal-split-by-default across participants, with the ability to assign a
  specific line item to specific participants, or exclude someone from a
  line item entirely (e.g. one person's individual snack shouldn't be
  split across everyone who came).
- The receipt photo is sent to a third-party LLM API for extraction, same
  low-stakes/conscious-choice trade-off already documented for the AI
  Event Summary above.
- No permission/lock model on receipts yet, mirroring the Contribution
  Ledger's existing trust model — acceptable for a small trusted-friends
  group, would need revisiting if a receipt's dollar amounts become a
  higher-stakes target for accidental or malicious edits.

---

## Future Ideas (explicitly not in v2 scope)

- A voting system so the group can jointly decide on date and/or location,
  instead of the organizer just picking one. Nice-to-have, not important
  right now.
- **Further languages beyond German/English/Spanish** — `de`/`en`/`es`
  ship today (`lib/i18n/dictionaries/`); adding another means a new
  dictionary file, a `LOCALES` entry (`lib/i18n/locales.ts`), a
  `LANGUAGE_NAMES` entry for the AI Summary, and adding the locale to the
  `Intl` locale maps in `lib/party-datetime.ts` / `lib/format-cents.ts` and
  the metadata map in `app/layout.tsx` — no other architectural change
  needed.
- **Cost splitting Milestone 2** — see "Receipt Scanner — Milestone 1"
  above for the full plan already agreed: equal-split-by-default across
  participants, with the ability to assign a specific line item to
  specific participants or exclude someone.

## Open Questions

1. **Duplicate/near-duplicate item names** (e.g. "Sausage" vs "Sausages") —
   acceptable as separate items for v2, or does this need autocomplete/merge
   suggestions later? Deferred — not a priority right now.
