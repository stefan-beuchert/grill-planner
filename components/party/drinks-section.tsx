"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Beer, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { setDrinkSelection } from "@/lib/actions/drink";
import { DrinkType } from "@/lib/generated/prisma/enums";
import { SectionHeading } from "@/components/party/section-heading";
import { useI18n } from "@/lib/i18n/locale-context";

type DrinkSelection = {
  participantId: string;
  type: DrinkType;
  quantity: number;
};

export function DrinksSection({
  slug,
  drinkSelections,
}: {
  slug: string;
  drinkSelections: DrinkSelection[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const stored = useStoredParticipant(slug);
  const [pendingType, setPendingType] = useState<DrinkType | null>(null);

  if (!stored) {
    return (
      <div className="flex flex-col gap-2">
        <SectionHeading icon={Beer}>{t.drinks.heading}</SectionHeading>
        <p className="text-muted-foreground text-sm">{t.drinks.joinPrompt}</p>
      </div>
    );
  }

  async function changeQuantity(type: DrinkType, quantity: number) {
    if (!stored) return;
    setPendingType(type);
    await setDrinkSelection(slug, stored.participantId, stored.editToken, type, quantity);
    setPendingType(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading icon={Beer}>{t.drinks.heading}</SectionHeading>
      <ul className="flex flex-col gap-2">
        {Object.values(DrinkType).map((type) => {
          const label = t.drinks.types[type];
          const quantity =
            drinkSelections.find(
              (s) => s.participantId === stored.participantId && s.type === type,
            )?.quantity ?? 0;
          const busy = pendingType === type;
          return (
            <li
              key={type}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-2 transition-colors",
                quantity > 0 && "border-primary/30 bg-accent",
              )}
            >
              <span className="text-base">{label}</span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={busy || quantity <= 0}
                  onClick={() => changeQuantity(type, quantity - 1)}
                  className="h-11 w-11"
                  aria-label={t.drinks.fewerAria(label)}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-4 text-center text-base tabular-nums">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={busy}
                  onClick={() => changeQuantity(type, quantity + 1)}
                  className="h-11 w-11"
                  aria-label={t.drinks.moreAria(label)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
