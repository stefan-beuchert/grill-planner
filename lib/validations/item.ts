import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function itemNameSchema(t: Dictionary) {
  return z.object({
    name: z.string().trim().min(1, t.common.itemNameRequired).max(60),
  });
}

export type ItemNameValues = z.infer<ReturnType<typeof itemNameSchema>>;
