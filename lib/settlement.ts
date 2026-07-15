// Pure settlement math for Cost Splitting Milestone 2 (see PRODUCT.md) — no
// DB, no React. Turns a party's receipts (who paid, who's included in each
// line item) into net per-participant balances, then simplifies those
// balances into a minimal set of "X owes Y" transactions. Independently
// unit-testable, see lib/settlement.test.ts.

import { splitLineItemCents } from "@/lib/split";

export type SplitReceiptLineItem = {
  lineTotalCents: number;
  includedParticipantIds: string[];
};

export type SplitReceipt = {
  paidByParticipantId: string | null;
  lineItems: SplitReceiptLineItem[];
};

/// Net balance = total paid (sum of receipt totals for receipts this
/// participant paid) minus total owed (their splitLineItemCents share,
/// using includedParticipantIds in participantIdsInOrder's relative order,
/// across every line item they're included in). Every participant in
/// `participantIdsInOrder` gets a key in the result, even if 0 — a
/// participant who never paid or was never included in anything nets to
/// exactly 0, not an absent key.
export function computeNetBalances(
  participantIdsInOrder: readonly string[],
  receipts: readonly SplitReceipt[],
): Map<string, number> {
  const balances = new Map<string, number>();
  for (const participantId of participantIdsInOrder) {
    balances.set(participantId, 0);
  }

  const orderIndex = new Map(participantIdsInOrder.map((id, index) => [id, index]));

  for (const receipt of receipts) {
    if (receipt.paidByParticipantId && balances.has(receipt.paidByParticipantId)) {
      const receiptTotalCents = receipt.lineItems.reduce(
        (sum, lineItem) => sum + lineItem.lineTotalCents,
        0,
      );
      balances.set(
        receipt.paidByParticipantId,
        balances.get(receipt.paidByParticipantId)! + receiptTotalCents,
      );
    }

    for (const lineItem of receipt.lineItems) {
      // Defensive — the write side (setLineItemSplitInclusion) refuses to
      // let the last included participant be excluded, so this shouldn't
      // happen in practice, but an empty split shouldn't blow up here.
      if (lineItem.includedParticipantIds.length === 0) continue;

      const orderedIncluded = [...lineItem.includedParticipantIds].sort(
        (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0),
      );
      const shares = splitLineItemCents(lineItem.lineTotalCents, orderedIncluded);
      for (const [participantId, shareCents] of shares) {
        if (!balances.has(participantId)) continue;
        balances.set(participantId, balances.get(participantId)! - shareCents);
      }
    }
  }

  return balances;
}

export type SettlementTransaction = {
  fromParticipantId: string;
  toParticipantId: string;
  amountCents: number;
};

type Balance = { participantId: string; amountCents: number };

function byAmountDescThenIdAsc(a: Balance, b: Balance): number {
  return b.amountCents - a.amountCents || a.participantId.localeCompare(b.participantId);
}

/// Standard greedy largest-creditor/largest-debtor matching — not
/// provably minimal, but simple and produces a small transaction count in
/// practice (see PRODUCT.md's documented trade-off). Deterministic: ties
/// are broken by `participantId.localeCompare()`.
export function simplifyDebts(
  netBalancesByParticipantId: ReadonlyMap<string, number>,
): SettlementTransaction[] {
  const creditors: Balance[] = [];
  const debtors: Balance[] = [];

  for (const [participantId, netCents] of netBalancesByParticipantId) {
    if (netCents > 0) {
      creditors.push({ participantId, amountCents: netCents });
    } else if (netCents < 0) {
      debtors.push({ participantId, amountCents: -netCents });
    }
  }

  creditors.sort(byAmountDescThenIdAsc);
  debtors.sort(byAmountDescThenIdAsc);

  const transactions: SettlementTransaction[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amountCents = Math.min(creditor.amountCents, debtor.amountCents);

    if (amountCents > 0) {
      transactions.push({
        fromParticipantId: debtor.participantId,
        toParticipantId: creditor.participantId,
        amountCents,
      });
    }

    creditor.amountCents -= amountCents;
    debtor.amountCents -= amountCents;
    if (creditor.amountCents === 0) creditorIndex += 1;
    if (debtor.amountCents === 0) debtorIndex += 1;
  }

  return transactions;
}
