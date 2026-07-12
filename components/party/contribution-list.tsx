"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, Minus, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { setContribution } from "@/lib/actions/item";
import { adminRemoveContribution } from "@/lib/actions/admin";
import { useI18n } from "@/lib/i18n/locale-context";

export type ContributionItem = {
  id: string;
  name: string;
  purchased?: boolean;
  purchasedByName?: string | null;
  contributions: { participantId: string; quantity: number; participantName: string }[];
};

export function ContributionList({
  slug,
  items,
  emptyText,
  joinPrompt,
  isAdmin = false,
}: {
  slug: string;
  items: ContributionItem[];
  emptyText: string;
  joinPrompt: string;
  isAdmin?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const stored = useStoredParticipant(slug);
  const [pendingId, setPendingId] = useState<string | null>(null);
  // Only one row can be in edit mode at a time. Opening a different row's
  // editor discards whatever draft quantity the previous row had.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState(0);

  if (!stored && !isAdmin) {
    return <p className="text-muted-foreground text-sm">{joinPrompt}</p>;
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyText}</p>;
  }

  function toggleEditing(itemId: string, currentMine: number) {
    if (editingId === itemId) {
      // Tapping the edit icon again on the same row closes it without
      // saving — the draft quantity is discarded.
      setEditingId(null);
      return;
    }
    setEditingId(itemId);
    setDraftQty(currentMine);
  }

  async function saveQuantity(itemId: string, originalMine: number) {
    if (!stored) return;
    if (draftQty === originalMine) {
      // Nothing actually changed — close without a network round trip.
      setEditingId(null);
      return;
    }
    setPendingId(itemId);
    await setContribution(slug, stored.participantId, stored.editToken, itemId, draftQty);
    setPendingId(null);
    setEditingId(null);
    router.refresh();
  }

  async function removeContribution(itemId: string, participantId: string) {
    setPendingId(itemId);
    await adminRemoveContribution(slug, itemId, participantId);
    setPendingId(null);
    router.refresh();
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const mine = stored
          ? (item.contributions.find((c) => c.participantId === stored.participantId)?.quantity ??
            0)
          : 0;
        const total = item.contributions.reduce((sum, c) => sum + c.quantity, 0);
        const busy = pendingId === item.id;
        const locked = item.purchased === true;
        const editing = editingId === item.id;

        return (
          <li
            key={item.id}
            className={cn(
              "flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 transition-colors",
              mine > 0 && "border-primary/30 bg-accent",
              editing && "border-primary bg-accent",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-base">{item.name}</span>
              <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-sm font-medium text-primary tabular-nums">
                × {total}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {item.contributions.map((c) => (
                <span
                  key={c.participantId}
                  className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                >
                  {c.participantName} {c.quantity}
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeContribution(item.id, c.participantId)}
                      aria-label={t.admin.removeContribution}
                      className="hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {locked ? (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Lock className="size-3.5" aria-hidden="true" />
                {item.purchasedByName ? t.shoppingList.purchasedBy(item.purchasedByName) : null}
              </span>
            ) : (
              stored && (
                <div className="flex items-center justify-end gap-3">
                  {editing && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={busy || draftQty <= 0}
                        onClick={() => setDraftQty((q) => Math.max(0, q - 1))}
                        className="h-11 w-11"
                        aria-label={t.common.fewerAria(item.name)}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="w-4 text-center text-base tabular-nums">{draftQty}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={busy || draftQty >= 99}
                        onClick={() => setDraftQty((q) => Math.min(99, q + 1))}
                        className="h-11 w-11"
                        aria-label={t.common.moreAria(item.name)}
                      >
                        <Plus className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        disabled={busy}
                        onClick={() => saveQuantity(item.id, mine)}
                        className="h-11 w-11"
                        aria-label={t.common.saveQuantityAria(item.name)}
                      >
                        <Check className="size-4" />
                      </Button>
                    </>
                  )}
                  {/* Same button in the same slot either way — it opens the
                      editor, or (while open) closes it and discards the
                      draft, per the "edit icon acts as a toggle" decision. */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={busy}
                    onClick={() => toggleEditing(item.id, mine)}
                    className="h-11 w-11"
                    aria-label={t.common.editQuantityAria(item.name)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              )
            )}
          </li>
        );
      })}
    </ul>
  );
}
