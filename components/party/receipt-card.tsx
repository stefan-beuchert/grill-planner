"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Pencil, Plus, Receipt as ReceiptIcon, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import {
  addReceiptLineItem,
  deleteReceipt,
  deleteReceiptLineItem,
  updateReceiptLineItem,
} from "@/lib/actions/receipt";
import { setLineItemSplitInclusion, setReceiptPayer } from "@/lib/actions/receipt-split";
import { useI18n } from "@/lib/i18n/locale-context";
import { formatCents } from "@/lib/format-cents";

export type ReceiptLineItemData = {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
  includedParticipantIds: string[];
};

export type ReceiptData = {
  id: string;
  store: string | null;
  scannedByName: string | null;
  paidByParticipantId: string | null;
  paidByName: string | null;
  lineItems: ReceiptLineItemData[];
};

// Editable draft form for a line item's name/price/quantity — shared shape
// between the inline row editor and the "add item manually" row below.
type Draft = { name: string; price: string; quantity: string };

function draftFromItem(item: ReceiptLineItemData): Draft {
  return { name: item.name, price: (item.priceCents / 100).toFixed(2), quantity: String(item.quantity) };
}

const EMPTY_DRAFT: Draft = { name: "", price: "", quantity: "1" };

export function ReceiptCard({
  slug,
  receipt,
  participants,
  defaultExpanded,
}: {
  slug: string;
  receipt: ReceiptData;
  participants: { id: string; name: string }[];
  defaultExpanded: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const stored = useStoredParticipant(slug);

  const [expanded, setExpanded] = useState(defaultExpanded);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const [addingItem, setAddingItem] = useState(false);
  const [addDraft, setAddDraft] = useState<Draft>(EMPTY_DRAFT);
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  const [payerBusy, setPayerBusy] = useState(false);
  const [payerError, setPayerError] = useState<string | null>(null);
  // Keyed by `${lineItemId}:${participantId}` — several split pills across
  // different line items can theoretically be in flight, but each one is
  // disabled individually while its own toggle is pending.
  const [splitBusyKey, setSplitBusyKey] = useState<string | null>(null);
  const [splitError, setSplitError] = useState<{ key: string; message: string } | null>(null);

  const total = receipt.lineItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const storeLabel = receipt.store || t.receipt.unknownStore;

  function parseDraft(value: Draft): { name: string; priceCents: number; quantity: number } | null {
    const priceNumber = Number(value.price.replace(",", "."));
    const quantityNumber = Number(value.quantity);
    if (!value.name.trim() || !Number.isFinite(priceNumber) || priceNumber < 0) return null;
    if (!Number.isFinite(quantityNumber) || quantityNumber < 1) return null;
    return {
      name: value.name.trim(),
      priceCents: Math.round(priceNumber * 100),
      quantity: Math.round(quantityNumber),
    };
  }

  function startEditing(item: ReceiptLineItemData) {
    setRowError(null);
    setEditingId(item.id);
    setDraft(draftFromItem(item));
  }

  async function saveEditing(itemId: string) {
    if (!stored) return;
    const parsed = parseDraft(draft);
    if (!parsed) {
      setRowError({ id: itemId, message: t.receipt.invalidPrice });
      return;
    }
    setBusyId(itemId);
    setRowError(null);
    const result = await updateReceiptLineItem(
      slug,
      stored.participantId,
      stored.editToken,
      itemId,
      parsed.name,
      parsed.priceCents,
      parsed.quantity,
    );
    setBusyId(null);
    if (!result.success) {
      setRowError({ id: itemId, message: result.error ?? t.common.actionFailed });
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function removeLineItem(itemId: string) {
    if (!stored) return;
    setBusyId(itemId);
    setRowError(null);
    const result = await deleteReceiptLineItem(slug, stored.participantId, stored.editToken, itemId);
    setBusyId(null);
    if (!result.success) {
      setRowError({ id: itemId, message: result.error ?? t.common.actionFailed });
      return;
    }
    router.refresh();
  }

  async function submitAddItem() {
    if (!stored) return;
    const parsed = parseDraft(addDraft);
    if (!parsed) {
      setAddError(t.receipt.invalidPrice);
      return;
    }
    setAddBusy(true);
    setAddError(null);
    const result = await addReceiptLineItem(
      slug,
      stored.participantId,
      stored.editToken,
      receipt.id,
      parsed.name,
      parsed.priceCents,
      parsed.quantity,
    );
    setAddBusy(false);
    if (!result.success) {
      setAddError(result.error ?? t.common.actionFailed);
      return;
    }
    setAddDraft(EMPTY_DRAFT);
    setAddingItem(false);
    router.refresh();
  }

  async function removeReceipt() {
    if (!stored) return;
    if (!window.confirm(t.receipt.deleteReceiptConfirm)) return;
    setBusyId(receipt.id);
    const result = await deleteReceipt(slug, stored.participantId, stored.editToken, receipt.id);
    setBusyId(null);
    if (result.success) {
      router.refresh();
    }
  }

  async function togglePayer(targetParticipantId: string) {
    if (!stored) return;
    const nextPayer = receipt.paidByParticipantId === targetParticipantId ? null : targetParticipantId;
    setPayerBusy(true);
    setPayerError(null);
    const result = await setReceiptPayer(slug, stored.participantId, stored.editToken, receipt.id, nextPayer);
    setPayerBusy(false);
    if (!result.success) {
      setPayerError(result.error ?? t.common.actionFailed);
      return;
    }
    router.refresh();
  }

  async function toggleSplitInclusion(lineItemId: string, targetParticipantId: string, nextIncluded: boolean) {
    if (!stored) return;
    const key = `${lineItemId}:${targetParticipantId}`;
    setSplitBusyKey(key);
    setSplitError(null);
    const result = await setLineItemSplitInclusion(
      slug,
      stored.participantId,
      stored.editToken,
      lineItemId,
      targetParticipantId,
      nextIncluded,
    );
    setSplitBusyKey(null);
    if (!result.success) {
      setSplitError({ key, message: result.error ?? t.common.actionFailed });
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={
            expanded ? t.receipt.collapseReceiptAria(storeLabel) : t.receipt.expandReceiptAria(storeLabel)
          }
          className="flex h-11 min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <ChevronRight
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform",
              expanded && "rotate-90",
            )}
            aria-hidden="true"
          />
          <ReceiptIcon className="text-primary size-4 shrink-0" aria-hidden="true" />
          <span className="truncate text-base font-semibold">{storeLabel}</span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">{formatCents(total, locale)}</span>
          {stored && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={busyId === receipt.id}
              onClick={removeReceipt}
              className="text-destructive h-11 w-11"
              aria-label={t.receipt.deleteReceipt}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          {receipt.scannedByName && (
            <span className="text-muted-foreground text-xs">
              {t.receipt.scannedBy(receipt.scannedByName)}
            </span>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium">{t.receipt.paidByLabel}</span>
            {stored ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {participants.map((p) => {
                  const active = receipt.paidByParticipantId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={payerBusy}
                      onClick={() => togglePayer(p.id)}
                      aria-label={
                        active ? t.receipt.clearPayerAria(p.name) : t.receipt.selectPayerAria(p.name)
                      }
                      className={cn(
                        "flex h-11 items-center rounded-full px-3.5 text-sm font-medium",
                        active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="text-sm">{receipt.paidByName ?? "—"}</span>
            )}
            {payerError && <p className="text-destructive text-xs">{payerError}</p>}
          </div>

          {receipt.lineItems.length === 0 && (
            <p className="text-muted-foreground text-sm">{t.receipt.noLineItems}</p>
          )}

          <ul className="flex flex-col gap-1.5">
            {receipt.lineItems.map((item) => {
              const editing = editingId === item.id;
              const busy = busyId === item.id;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-lg border px-2.5 py-1.5",
                    editing && "border-primary bg-accent",
                  )}
                >
                  {editing ? (
                    <div className="flex flex-col gap-1.5">
                      <Input
                        value={draft.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder={t.receipt.namePlaceholder}
                        className="h-11 text-base"
                        autoComplete="off"
                      />
                      <div className="flex gap-1.5">
                        <Input
                          value={draft.price}
                          onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                          placeholder={t.receipt.pricePlaceholder}
                          inputMode="decimal"
                          type="number"
                          step="0.01"
                          min="0"
                          className="h-11 flex-1 text-base"
                        />
                        <Input
                          value={draft.quantity}
                          onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
                          placeholder={t.receipt.quantityPlaceholder}
                          inputMode="numeric"
                          type="number"
                          step="1"
                          min="1"
                          className="h-11 w-20 text-base"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={busy}
                          onClick={() => setEditingId(null)}
                          className="h-11 w-11 shrink-0"
                          aria-label={t.receipt.cancelEditLineItemAria(item.name)}
                        >
                          <X className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          disabled={busy}
                          onClick={() => saveEditing(item.id)}
                          className="h-11 w-11 shrink-0"
                          aria-label={t.receipt.saveLineItemAria(item.name)}
                        >
                          <Check className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-base">
                        {item.name}
                        {item.quantity > 1 && (
                          <span className="text-muted-foreground ml-1.5 text-sm font-normal">
                            × {item.quantity}
                          </span>
                        )}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-medium tabular-nums">
                          {formatCents(item.priceCents * item.quantity, locale)}
                        </span>
                        {stored && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => startEditing(item)}
                              aria-label={t.receipt.editLineItemAria(item.name)}
                              className="text-muted-foreground hover:text-foreground flex h-11 w-11 items-center justify-center"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => removeLineItem(item.id)}
                              aria-label={t.receipt.deleteLineItemAria(item.name)}
                              className="text-muted-foreground hover:text-destructive flex h-11 w-11 items-center justify-center"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {rowError?.id === item.id && (
                    <p className="text-destructive text-xs">{rowError.message}</p>
                  )}

                  {participants.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-xs">{t.receipt.splitWithLabel}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {participants.map((p) => {
                          const included = item.includedParticipantIds.includes(p.id);
                          const key = `${item.id}:${p.id}`;
                          const splitBusy = splitBusyKey === key;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={!stored || splitBusy}
                              onClick={() => toggleSplitInclusion(item.id, p.id, !included)}
                              aria-label={
                                included
                                  ? t.receipt.toggleSplitExcludeAria(p.name, item.name)
                                  : t.receipt.toggleSplitIncludeAria(p.name, item.name)
                              }
                              className={cn(
                                "flex h-11 items-center rounded-full px-3.5 text-sm font-medium",
                                included
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-muted-foreground opacity-60",
                              )}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                      {splitError?.key.startsWith(`${item.id}:`) && (
                        <p className="text-destructive text-xs">{splitError.message}</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {stored &&
            (addingItem ? (
              <div className="flex flex-col gap-1.5 rounded-lg border px-2.5 py-1.5">
                <Input
                  value={addDraft.name}
                  onChange={(e) => setAddDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder={t.receipt.namePlaceholder}
                  className="h-11 text-base"
                  autoComplete="off"
                />
                <div className="flex gap-1.5">
                  <Input
                    value={addDraft.price}
                    onChange={(e) => setAddDraft((d) => ({ ...d, price: e.target.value }))}
                    placeholder={t.receipt.pricePlaceholder}
                    inputMode="decimal"
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-11 flex-1 text-base"
                  />
                  <Input
                    value={addDraft.quantity}
                    onChange={(e) => setAddDraft((d) => ({ ...d, quantity: e.target.value }))}
                    placeholder={t.receipt.quantityPlaceholder}
                    inputMode="numeric"
                    type="number"
                    step="1"
                    min="1"
                    className="h-11 w-20 text-base"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={addBusy}
                    onClick={() => {
                      setAddingItem(false);
                      setAddDraft(EMPTY_DRAFT);
                      setAddError(null);
                    }}
                    className="h-11 w-11 shrink-0"
                    aria-label={t.common.cancel}
                  >
                    <X className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    disabled={addBusy}
                    onClick={submitAddItem}
                    className="h-11 w-11 shrink-0"
                    aria-label={t.receipt.addItemSubmit}
                  >
                    <Check className="size-4" />
                  </Button>
                </div>
                {addError && <p className="text-destructive text-xs">{addError}</p>}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddingItem(true)}
                className="h-11 gap-1.5 self-start text-sm"
              >
                <Plus className="size-4" />
                {t.receipt.addItem}
              </Button>
            ))}
        </>
      )}
    </div>
  );
}
