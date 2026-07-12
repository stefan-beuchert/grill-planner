"use client";

import { PartyNote } from "@/components/party/party-note";
import { setLocationNote } from "@/lib/actions/party";
import { useI18n } from "@/lib/i18n/locale-context";

// Independent from GeneralNote (Guests tab) — separate field, separate
// coordination context (logistics/directions vs general info), even
// though it reuses the same lightweight note-widget UI.
export function LocationNote({ slug, note }: { slug: string; note: string | null }) {
  const { t } = useI18n();

  return (
    <PartyNote
      slug={slug}
      note={note}
      label={t.partyPage.notes}
      addLabel={t.partyPage.addNote}
      editLabel={t.partyPage.editNote}
      placeholder={t.partyPage.locationNotePlaceholder}
      save={setLocationNote}
    />
  );
}
