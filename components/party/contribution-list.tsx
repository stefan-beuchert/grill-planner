"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, Minus, Pencil, Plus, ShoppingCart, SquareCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { useStoredOrganizer } from "@/lib/hooks/use-stored-organizer";
import { setContribution, setItemPurchased } from "@/lib/actions/item";
import { adminRemoveContribution, adminUnmarkPurchased } from "@/lib/actions/admin";
import { useI18n } from "@/lib/i18n/locale-context";

export type ContributionItem = {
  id: string;
  name: string;
  purchased?: boolean;
  purchasedByParticipantId?: string | null;
  purchasedByName?: string | null;
  contributions: { participantId: string; quantity: number; participantName: string }[];
};

export function ContributionList({
  slug,
  items,
  emptyText,
  joinPrompt,
  isAdmin = false,
  canMarkPurchased = false,
}: {
  slug: string;
  items: ContributionItem[];
  emptyText: string;
  joinPrompt: string;
  isAdmin?: boolean;
  canMarkPurchased?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const stored = useStoredParticipant(slug);
  const organizer = useStoredOrganizer(slug);
  const canManage = isAdmin || !!organizer;
  const [pendingId, setPendingId] = useState<string | null>(null);
  // Only one row can be in edit mode at a time. Opening a different row's
  // editor discards whatever draft quantity the previous row had.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState(0);
  // Actions used to be fire-and-forget — a rejected action (locked item,
  // stale token, server error) failed silently from the user's point of
  // view. Track which row's action failed and show it inline instead.
  const [rowError, setRowError] = useState<{ itemId: string; message: string } | null>(null);

  if (!stored && !canManage) {
    return <p className="text-muted-foreground text-sm">{joinPrompt}</p>;
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyText}</p>;
  }

  // Some actions (setContribution, setItemPurchased, moveItem) return a
  // specific error string; others (the plain admin/organizer ones) return
  // just {success:false} — this covers both without fighting TS's union
  // narrowing across mismatched result shapes.
  function errorMessageFrom(result: unknown): string {
    if (
      result &&
      typeof result === "object" &&
      "error" in result &&
      typeof (result as { error: unknown }).error === "string"
    ) {
      return (result as { error: string }).error;
    }
    return t.common.actionFailed;
  }

  function toggleEditing(itemId: string, currentMine: number) {
    setRowError(null);
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
    setRowError(null);
    const result = await setContribution(slug, stored.participantId, stored.editToken, itemId, draftQty);
    setPendingId(null);
    if (!result.success) {
      setRowError({ itemId, message: errorMessageFrom(result) });
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function removeContribution(itemId: string, participantId: string) {
    setPendingId(itemId);
    setRowError(null);
    const result = await adminRemoveContribution(slug, itemId, participantId, organizer?.organizerToken);
    setPendingId(null);
    if (!result.success) {
      setRowError({ itemId, message: errorMessageFrom(result) });
      return;
    }
    router.refresh();
  }

  async function togglePurchased(itemId: string, purchased: boolean) {
    if (!stored) return;
    setPendingId(itemId);
    setRowError(null);
    const result = await setItemPurchased(slug, stored.participantId, stored.editToken, itemId, purchased);
    setPendingId(null);
    if (!result.success) {
      setRowError({ itemId, message: errorMessageFrom(result) });
      return;
    }
    router.refresh();
  }

  async function adminUnmark(itemId: string) {
    setPendingId(itemId);
    setRowError(null);
    const result = await adminUnmarkPurchased(slug, itemId, organizer?.organizerToken);
    setPendingId(null);
    if (!result.success) {
      setRowError({ itemId, message: errorMessageFrom(result) });
      return;
    }
    router.refresh();
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => {
        const mine = stored
          ? (item.contributions.find((c) => c.participantId === stored.participantId)?.quantity ??
            0)
          : 0;
        const total = item.contributions.reduce((sum, c) => sum + c.quantity, 0);
        const busy = pendingId === item.id;
        const locked = item.purchased === true;
        const editing = editingId === item.id;
        const canUnmarkThis = stored?.participantId === item.purchasedByParticipantId;
        const showPurchaseControl = canMarkPurchased && (locked || !!stored);
        const canTogglePurchased = locked ? canUnmarkThis || canManage : true;
        // Single-contributor items can show the name inline on the title
        // row instead of a separate badge row below — nothing to wrap.
        // Pooled items (2+ contributors) keep the stacked row: cramming
        // several names onto one line would truncate who's covering what,
        // which is the whole point of the contributor breakdown.
        const soleContributor = item.contributions.length === 1 ? item.contributions[0] : null;

        return (
          <li
            key={item.id}
            className={cn(
              "flex flex-col gap-1 rounded-xl border px-3 py-1.5 transition-colors",
              mine > 0 && !locked && "border-primary/30 bg-accent",
              editing && "border-primary bg-accent",
              locked && "border-success/30 bg-success/10",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-base">
                {item.name}
                {soleContributor && (
                  <span className="text-muted-foreground ml-1.5 text-sm font-normal">
                    — {soleContributor.participantName}
                  </span>
                )}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-sm font-medium text-primary tabular-nums">
                  × {total}
                </span>
                {showPurchaseControl &&
                  (canTogglePurchased ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={busy}
                      onClick={() =>
                        locked
                          ? canUnmarkThis
                            ? togglePurchased(item.id, false)
                            : adminUnmark(item.id)
                          : togglePurchased(item.id, true)
                      }
                      className={cn("h-11 w-11", locked && "border-success/40 text-success")}
                      aria-label={
                        locked
                          ? t.shoppingList.unmarkAria(item.name)
                          : t.shoppingList.markPurchasedAria(item.name)
                      }
                    >
                      {locked ? <SquareCheck className="size-4" /> : <ShoppingCart className="size-4" />}
                    </Button>
                  ) : (
                    <span
                      className="text-success flex h-11 w-11 items-center justify-center"
                      aria-label={t.shoppingList.purchasedAria(item.name)}
                    >
                      <SquareCheck className="size-4" />
                    </span>
                  ))}
                {!locked && stored && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={busy}
                    onClick={() => toggleEditing(item.id, mine)}
                    className="h-11 w-11"
                    aria-label={
                      editing
                        ? t.common.cancelQuantityAria(item.name)
                        : t.common.editQuantityAria(item.name)
                    }
                  >
                    {editing ? <X className="size-4" /> : <Pencil className="size-4" />}
                  </Button>
                )}
              </div>
            </div>
            {rowError?.itemId === item.id && (
              <p className="text-destructive text-xs">{rowError.message}</p>
            )}
            {canMarkPurchased && locked && (
              <div className="text-success flex min-w-0 items-center gap-1 text-xs font-medium">
                <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {item.purchasedByName ? t.shoppingList.purchasedBy(item.purchasedByName) : null}
                </span>
              </div>
            )}
            {(!soleContributor || canManage) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {item.contributions.map((c) => (
                  <span
                    key={c.participantId}
                    className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                  >
                    {c.participantName} {c.quantity}
                    {canManage && (
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
            )}
            {editing && stored && (
              <div className="flex items-center justify-end gap-3">
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
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
