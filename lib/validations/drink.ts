import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function drinkItemNameSchema(t: Dictionary) {
  return z.object({
    name: z.string().trim().min(1, t.drinks.nameRequired).max(60),
  });
}

export type DrinkItemNameValues = z.infer<ReturnType<typeof drinkItemNameSchema>>;
