import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format-cents";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";

export type SettlementBalance = {
  participantId: string;
  participantName: string;
  netCents: number;
};

export type SettlementTransactionView = {
  fromName: string;
  toName: string;
  amountCents: number;
};

// Plain Server Component — no interactivity, so it takes t/locale as props
// (like location-section.tsx) rather than calling useI18n(). Recomputed on
// every render from lib/settlement.ts's pure functions; nothing here is
// stored (see PRODUCT.md's Cost Splitting Milestone 2 trade-offs).
export function ReceiptSettlementSummary({
  balances,
  transactions,
  t,
  locale,
}: {
  balances: SettlementBalance[];
  transactions: SettlementTransactionView[];
  t: Dictionary;
  locale: Locale;
}) {
  if (balances.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3">
      <h3 className="text-base font-semibold">{t.receipt.settlementHeading}</h3>

      <ul className="flex flex-col gap-1">
        {balances.map((balance) => (
          <li
            key={balance.participantId}
            className={cn(
              "text-sm",
              balance.netCents > 0 && "text-success",
              balance.netCents < 0 && "text-destructive",
              balance.netCents === 0 && "text-muted-foreground",
            )}
          >
            {balance.netCents > 0
              ? t.receipt.balanceOwed(balance.participantName, formatCents(balance.netCents, locale))
              : balance.netCents < 0
                ? t.receipt.balanceOwes(balance.participantName, formatCents(-balance.netCents, locale))
                : `${balance.participantName} — ${formatCents(0, locale)}`}
          </li>
        ))}
      </ul>

      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.receipt.settlementAllSettled}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 border-t pt-2">
          {transactions.map((transaction, index) => (
            <li key={index} className="flex items-center gap-1.5 text-sm">
              <ArrowRight className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">
                {t.receipt.settlementOwes(
                  transaction.fromName,
                  transaction.toName,
                  formatCents(transaction.amountCents, locale),
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
