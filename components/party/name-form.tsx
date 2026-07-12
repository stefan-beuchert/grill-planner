"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  participantNameSchema,
  type ParticipantNameValues,
} from "@/lib/validations/participant";
import { useI18n } from "@/lib/i18n/locale-context";

export function NameForm({
  submitLabel,
  defaultName,
  onSubmit,
}: {
  submitLabel: string;
  defaultName?: string;
  onSubmit: (name: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => participantNameSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ParticipantNameValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: defaultName ?? "" },
  });

  async function handle(values: ParticipantNameValues) {
    setServerError(null);
    const result = await onSubmit(values.name);
    if (!result.success) {
      setServerError(result.error ?? t.participants.genericError);
    }
  }

  return (
    <form onSubmit={handleSubmit(handle)} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          placeholder={t.participants.joinPlaceholder}
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
