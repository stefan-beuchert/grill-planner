"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/party/section-heading";
import { PartyNote } from "@/components/party/party-note";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { setItemPurchased } from "@/lib/actions/item";
import { adminUnmarkPurchased } from "@/lib/actions/admin";
import { setPartyNote } from "@/lib/actions/party";
import { useI18n } from "@/lib/i18n/locale-context";

export type ShoppingItem = {
  id: string;
  name: string;
  purchased: boolean;
  purchasedByParticipantId: string | null;
  purchasedByName: string | null;
  total: number;
};

export function ShoppingListSection({
  slug,
  items,
  note,
  isAdmin = false,
}: {
  slug: string;
  items: ShoppingItem[];
  note: string | null;
  isAdmin?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const stored = useStoredParticipant(slug);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function toggle(itemId: string, purchased: boolean) {
    if (!stored) return;
    setPendingId(itemId);
    await setItemPurchased(slug, stored.participantId, stored.editToken, itemId, purchased);
    setPendingId(null);
    router.refresh();
  }

  async function adminUnmark(itemId: string) {
    setPendingId(itemId);
    await adminUnmarkPurchased(slug, itemId);
    setPendingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading icon={ShoppingCart}>{t.shoppingList.heading}</SectionHeading>
      <PartyNote
        slug={slug}
        note={note}
        label={t.sharedPurchases.noteLabel}
        addLabel={t.sharedPurchases.addNote}
        editLabel={t.sharedPurchases.editNote}
        placeholder={t.sharedPurchases.notePlaceholder}
        save={setPartyNote}
      />

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.shoppingList.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const busy = pendingId === item.id;
            const canUnmark = stored?.participantId === item.purchasedByParticipantId;
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5",
                  item.purchased && "border-primary/30 bg-accent",
                )}
              >
                <div className="flex flex-col">
                  <span className="text-base">{item.name}</span>
                  {item.purchased && item.purchasedByName && (
                    <span className="text-muted-foreground text-xs">
                      {t.shoppingList.purchasedBy(item.purchasedByName)}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-sm font-medium text-primary tabular-nums">
                    × {item.total}
                  </span>
                  {stored && !item.purchased && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => toggle(item.id, true)}
                    >
                      {t.shoppingList.markPurchased}
                    </Button>
                  )}
                  {stored && item.purchased && canUnmark && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => toggle(item.id, false)}
                    >
                      {t.shoppingList.unmark}
                    </Button>
                  )}
                  {item.purchased && !canUnmark && isAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => adminUnmark(item.id)}
                    >
                      {t.admin.adminUnmark}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
