# Grill Planner — Product Vision (v2, draft)

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
  bundles weather + map + driver coordination; Shared Purchases bundles
  Food/Drinks/Other) — not necessarily one single atomic task.
- The interface should be simple enough that someone can understand it
  without explanation.

---

## Navigation

The app keeps the same five-tab shape as v1 — merging Food and Drinks into
one tab is what makes room for the new "Things People Bring" tab without
growing the tab count:

1. **Guests** — participant list
2. **Shared Purchases** — Food / Drinks / Other (collapsible sections)
3. **Things People Bring**
4. **Shopping List**
5. **Location** — weather + map + car sharing / driver coordination

A persistent **party identity bar** stays visible above all five tabs:
party title + date. It exists purely to stop the app from feeling generic
when switching tabs — every page should immediately confirm which party
you're looking at.

---

## Core Concept: The Contribution Ledger

This is the shared mechanic behind both Shared Purchases and Things People
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

## Shared Purchases

Shared Purchases contains everything that needs to be bought collectively,
using the Contribution Ledger above.

It is divided into:

- Food
- Drinks
- Other

Each section is collapsible.

Items display:

- name
- total quantity
- breakdown of contributors and their amounts

Only Shared Purchases items generate Shopping List entries.

Each party has one optional, freely-editable **note** attached to Shared
Purchases — plain text, set by whoever, visible to everyone. This exists for
context that changes what "shared" even means for that party, e.g. "we're
each grilling our own meat this time, only chip in for drinks/bread/sauces."
It's informational only; it doesn't restrict what categories or items can be
added. It's also shown on the **Shopping List**, since that's where it
matters most — at the point of actually buying things.

## Shopping List

The Shopping List is the aggregated, buyer-facing view of Shared Purchases:
one line per item, total quantity, no per-contributor detail.

- Any participant can mark an item as **purchased**.
- Marking an item purchased **locks** it: no one can add, edit, or remove
  contributions for that item while it's locked.
- Once purchased, the item shows the **purchaser's name** next to it — so
  it's clear who to ask if something's missing or wrong.
- Only the participant who marked an item purchased can **unmark** it.
  Nobody else can undo someone else's purchase — except via Admin Mode.
- The Shopping List itself has no items of its own — it only ever reflects
  Shared Purchases.

## Things People Bring

Participants can register things they're bringing themselves, using the
same Contribution Ledger mechanic as Shared Purchases — including pooling
(e.g. three people can each pledge "2 bags of ice," so the group sees "6
bags of ice covered" without anyone shopping for it).

Examples:

- Potato Salad
- Dessert
- Bluetooth Speaker
- Ice

Differences from Shared Purchases:

- These items **never** generate Shopping List entries.
- There is no "purchased" state — nothing here is bought as a group, so
  there's nothing to lock.

Like Shared Purchases, this tab has its own optional, freely-editable note
(separate from the Shared Purchases one, since the two are different
coordination contexts) — e.g. "please bring your own plates and cups."

---

## Admin Mode

A single 4-digit passcode (set once by the app owner, not per-party)
unlocks admin mode on a device — no separate hidden URL to remember or
manage.

While in admin mode:

- See an **overview of every party** that exists in the app (title, date,
  participant count), with the ability to **delete** any of them. This is
  how test parties and abandoned ones get cleaned up.
- **Edit party details** (title, date, time, location, notes) or **cancel**
  any individual party.
- **Unmark any purchased item**, even one purchased by someone else — the
  admin override for a stuck/locked item.
- **Edit or remove any contribution** in Shared Purchases or Things People
  Bring, even one added by someone else — the fix for a wrong, orphaned, or
  unreachable contributor's pledge (e.g. someone drops out but can't update
  what they said they'd bring).
- **Remove any guest** from a party — e.g. a duplicate entry, or someone who
  was added by mistake.

Everything else stays open exactly as described above: any participant can
still add themselves as a guest, contribute to Shared Purchases or Things
People Bring, and mark Shopping List items purchased, without needing the
passcode. Admin Mode exists purely as a correction/cleanup layer on top of
that open model, not a gate on normal use.

**Known trade-offs:**

- Editing a party's core details or cancelling it is only possible for
  whoever holds the passcode — today, that's just the app owner. If this
  app is ever used by multiple independent hosts rather than mostly by one
  person, per-party creator rights would need revisiting. Acceptable for
  now since that's not the current usage pattern.
- A 4-digit passcode is a small keyspace (10,000 combinations) guarding
  delete-everything power, with no separate account or rate-limiting
  concept in this app. Acceptable for a small trusted-friends tool; would
  need strengthening (longer code, rate limiting) if the app were ever
  opened up beyond people you know.

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

## Future Ideas (explicitly not in v2 scope)

- A voting system so the group can jointly decide on date and/or location,
  instead of the organizer just picking one. Nice-to-have, not important
  right now.

## Open Questions

1. **Duplicate/near-duplicate item names** (e.g. "Sausage" vs "Sausages") —
   acceptable as separate items for v2, or does this need autocomplete/merge
   suggestions later? Deferred — not a priority right now.
