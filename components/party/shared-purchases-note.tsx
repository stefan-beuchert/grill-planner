"use client";

import { PartyNote } from "@/components/party/party-note";
import { setPartyNote } from "@/lib/actions/party";
import { useI18n } from "@/lib/i18n/locale-context";

// Thin wrapper: the Shared Purchases note is used in two places (its own
// tab and the Shopping List, per PRODUCT.md) with identical copy/save
// wiring — defined once here instead of repeated at each call site.
export function SharedPurchasesNote({ slug, note }: { slug: string; note: string | null }) {
  const { t } = useI18n();

  return (
    <PartyNote
      slug={slug}
      note={note}
      label={t.sharedPurchases.noteLabel}
      addLabel={t.sharedPurchases.addNote}
      editLabel={t.sharedPurchases.editNote}
      placeholder={t.sharedPurchases.notePlaceholder}
      save={setPartyNote}
    />
  );
}
