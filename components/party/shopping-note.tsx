"use client";

import { PartyNote } from "@/components/party/party-note";
import { setShoppingNote } from "@/lib/actions/party";
import { useI18n } from "@/lib/i18n/locale-context";

// Independent from the Shared Purchases note — its own field, even though
// the two tabs are closely related. Every tab's note is now standalone.
export function ShoppingNote({ slug, note }: { slug: string; note: string | null }) {
  const { t } = useI18n();

  return (
    <PartyNote
      slug={slug}
      note={note}
      label={t.shoppingList.noteLabel}
      addLabel={t.shoppingList.addNote}
      editLabel={t.shoppingList.editNote}
      placeholder={t.shoppingList.notePlaceholder}
      save={setShoppingNote}
    />
  );
}
