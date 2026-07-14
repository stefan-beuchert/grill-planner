import type { Locale } from "@/lib/i18n/locales";

// Money is stored as Int cents (see prisma/schema.prisma's ReceiptLineItem)
// to avoid floating-point rounding errors — this is the one place it's
// converted back to a display string. Always EUR: this app has no
// multi-currency concept yet.
export function formatCents(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
