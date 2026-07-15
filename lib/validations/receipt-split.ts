import { z } from "zod";

// No `t` needed here — same carve-out as lib/validations/quantity.ts, these
// are structural checks (boolean, non-empty id), not user-facing message
// text that needs translating.
export const lineItemSplitIncludedSchema = z.boolean();

export const receiptPayerSchema = z.object({
  participantId: z.string().min(1).nullable(),
});

export type ReceiptPayerValues = z.infer<typeof receiptPayerSchema>;
