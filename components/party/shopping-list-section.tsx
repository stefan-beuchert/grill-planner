import { ShoppingCart } from "lucide-react";
import { SectionHeading } from "@/components/party/section-heading";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Item = {
  name: string;
  selections: { quantity: number }[];
};

function aggregateQuantities(items: Item[]) {
  return items
    .map((item) => ({
      name: item.name,
      total: item.selections.reduce((sum, s) => sum + s.quantity, 0),
    }))
    .filter((item) => item.total > 0);
}

export function ShoppingListSection({
  foodItems,
  drinkItems,
  t,
}: {
  foodItems: Item[];
  drinkItems: Item[];
  t: Dictionary;
}) {
  const foodTotals = aggregateQuantities(foodItems);
  const drinkTotals = aggregateQuantities(drinkItems);

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading icon={ShoppingCart}>{t.shoppingList.heading}</SectionHeading>
      {foodTotals.length === 0 && drinkTotals.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.shoppingList.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 rounded-xl bg-muted/50 p-3">
          {[
            ...foodTotals.map((item) => ({ ...item, key: `food-${item.name}` })),
            ...drinkTotals.map((item) => ({ ...item, key: `drink-${item.name}` })),
          ].map((item) => (
            <li key={item.key} className="flex items-center justify-between text-base">
              <span>{item.name}</span>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-sm font-medium text-primary tabular-nums">
                × {item.total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
