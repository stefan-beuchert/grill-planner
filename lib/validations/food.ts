import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function foodItemNameSchema(t: Dictionary) {
  return z.object({
    name: z.string().trim().min(1, t.food.nameRequired).max(60),
  });
}

export type FoodItemNameValues = z.infer<ReturnType<typeof foodItemNameSchema>>;
