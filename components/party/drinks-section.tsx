"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Beer, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { addDrinkItem, setDrinkSelection } from "@/lib/actions/drink";
import { drinkItemNameSchema, type DrinkItemNameValues } from "@/lib/validations/drink";
import { SectionHeading } from "@/components/party/section-heading";
import { useI18n } from "@/lib/i18n/locale-context";

type DrinkItem = {
  id: string;
  name: string;
  selections: { participantId: string; quantity: number }[];
};

export function DrinksSection({
  slug,
  drinkItems,
}: {
  slug: string;
  drinkItems: DrinkItem[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const stored = useStoredParticipant(slug);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (!stored) {
    return (
      <div className="flex flex-col gap-2">
        <SectionHeading icon={Beer}>{t.drinks.heading}</SectionHeading>
        <p className="text-muted-foreground text-sm">{t.drinks.joinPrompt}</p>
      </div>
    );
  }

  async function changeQuantity(drinkItemId: string, quantity: number) {
    if (!stored) return;
    setPendingId(drinkItemId);
    await setDrinkSelection(slug, stored.participantId, stored.editToken, drinkItemId, quantity);
    setPendingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading icon={Beer}>{t.drinks.heading}</SectionHeading>
      <ul className="flex flex-col gap-2">
        {drinkItems.map((item) => {
          const quantity =
            item.selections.find((s) => s.participantId === stored.participantId)?.quantity ?? 0;
          const busy = pendingId === item.id;
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-2 transition-colors",
                quantity > 0 && "border-primary/30 bg-accent",
              )}
            >
              <span className="text-base">{item.name}</span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={busy || quantity <= 0}
                  onClick={() => changeQuantity(item.id, quantity - 1)}
                  className="h-11 w-11"
                  aria-label={t.drinks.fewerAria(item.name)}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-4 text-center text-base tabular-nums">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={busy}
                  onClick={() => changeQuantity(item.id, quantity + 1)}
                  className="h-11 w-11"
                  aria-label={t.drinks.moreAria(item.name)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <AddDrinkItemForm
        slug={slug}
        participantId={stored.participantId}
        editToken={stored.editToken}
      />
    </div>
  );
}

function AddDrinkItemForm({
  slug,
  participantId,
  editToken,
}: {
  slug: string;
  participantId: string;
  editToken: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => drinkItemNameSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DrinkItemNameValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: DrinkItemNameValues) {
    setServerError(null);
    const result = await addDrinkItem(slug, participantId, editToken, values.name);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          placeholder={t.drinks.addPlaceholder}
          autoComplete="off"
          className="h-12 flex-1 text-base"
          {...register("name")}
        />
        <Button type="submit" disabled={isSubmitting} className="h-12 text-base">
          {t.drinks.addSubmit}
        </Button>
      </div>
      {(errors.name || serverError) && (
        <p className="text-sm text-destructive">{errors.name?.message ?? serverError}</p>
      )}
    </form>
  );
}
