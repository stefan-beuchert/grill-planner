"use client";

import { PartyNote } from "@/components/party/party-note";
import { setPartyNote } from "@/lib/actions/party";
import { useI18n } from "@/lib/i18n/locale-context";

// The single note for the merged Shopping List tab (v4: Shared Purchases and
// Shopping List are now one screen, so there's only one note field again).
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
