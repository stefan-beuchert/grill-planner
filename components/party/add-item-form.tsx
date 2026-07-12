"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addItem } from "@/lib/actions/item";
import { itemNameSchema, type ItemNameValues } from "@/lib/validations/item";
import { useI18n } from "@/lib/i18n/locale-context";
import type { ItemCategory, ItemListType } from "@/lib/generated/prisma/enums";

export function AddItemForm({
  slug,
  participantId,
  editToken,
  listType,
  category,
  placeholder,
  submitLabel,
}: {
  slug: string;
  participantId: string;
  editToken: string;
  listType: ItemListType;
  category: ItemCategory | null;
  placeholder: string;
  submitLabel: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => itemNameSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemNameValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: ItemNameValues) {
    setServerError(null);
    const result = await addItem(
      slug,
      participantId,
      editToken,
      values.name,
      listType,
      category,
    );
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
          placeholder={placeholder}
          autoComplete="off"
          className="h-12 flex-1 text-base"
          {...register("name")}
        />
        <Button type="submit" disabled={isSubmitting} className="h-12 text-base">
          {submitLabel}
        </Button>
      </div>
      {(errors.name || serverError) && (
        <p className="text-sm text-destructive">{errors.name?.message ?? serverError}</p>
      )}
    </form>
  );
}
