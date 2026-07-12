import { ShoppingCart } from "lucide-react";
import { DrinkType } from "@/lib/generated/prisma/enums";
import { SectionHeading } from "@/components/party/section-heading";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type FoodItem = {
  name: string;
  selections: { quantity: number }[];
};

type DrinkSelection = {
  type: DrinkType;
  quantity: number;
};

export function ShoppingListSection({
  foodItems,
  drinkSelections,
  t,
}: {
  foodItems: FoodItem[];
  drinkSelections: DrinkSelection[];
  t: Dictionary;
}) {
  const foodTotals = foodItems
    .map((item) => ({
      name: item.name,
      total: item.selections.reduce((sum, s) => sum + s.quantity, 0),
    }))
    .filter((item) => item.total > 0);

  const drinkTotals = Object.values(DrinkType)
    .map((type) => ({
      type,
      total: drinkSelections
        .filter((d) => d.type === type)
        .reduce((sum, d) => sum + d.quantity, 0),
    }))
    .filter((d) => d.total > 0);

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading icon={ShoppingCart}>{t.shoppingList.heading}</SectionHeading>
      {foodTotals.length === 0 && drinkTotals.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.shoppingList.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 rounded-xl bg-muted/50 p-3">
          {foodTotals.map((item) => (
            <li key={item.name} className="flex items-center justify-between text-base">
              <span>{item.name}</span>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-sm font-medium text-primary tabular-nums">
                × {item.total}
              </span>
            </li>
          ))}
          {drinkTotals.map((d) => (
            <li key={d.type} className="flex items-center justify-between text-base">
              <span>{t.drinks.types[d.type]}</span>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-sm font-medium text-primary tabular-nums">
                × {d.total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
