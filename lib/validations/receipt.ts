import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function receiptLineItemSchema(t: Dictionary) {
  return z.object({
    name: z.string().trim().min(1, t.common.itemNameRequired).max(60),
    priceCents: z.number().int().min(0).max(99_999_99),
    quantity: z.number().int().min(1).max(99),
  });
}

export type ReceiptLineItemValues = z.infer<ReturnType<typeof receiptLineItemSchema>>;
