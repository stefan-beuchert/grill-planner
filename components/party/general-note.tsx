"use client";

import { PartyNote } from "@/components/party/party-note";
import { setPartyNotes } from "@/lib/actions/party";
import { useI18n } from "@/lib/i18n/locale-context";

// Thin wrapper around the general party note (e.g. "bring your own chair,
// parking is on the street") — shown identically on the Guests tab and the
// Location tab, per PRODUCT.md.
export function GeneralNote({ slug, notes }: { slug: string; notes: string | null }) {
  const { t } = useI18n();

  return (
    <PartyNote
      slug={slug}
      note={notes}
      label={t.partyPage.notes}
      addLabel={t.partyPage.addNote}
      editLabel={t.partyPage.editNote}
      placeholder={t.partyPage.notePlaceholder}
      save={setPartyNotes}
    />
  );
}
