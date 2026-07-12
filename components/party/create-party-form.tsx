"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createParty } from "@/lib/actions/party";
import { partyFormSchema, type PartyFormValues } from "@/lib/validations/party";
import { useI18n } from "@/lib/i18n/locale-context";

export function CreatePartyForm() {
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => partyFormSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PartyFormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: PartyFormValues) {
    setServerError(null);
    const result = await createParty(values);
    // On success the action redirects and never returns here.
    if (result && !result.success) {
      setServerError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">{t.createPartyForm.titleLabel}</Label>
        <Input
          id="title"
          placeholder={t.createPartyForm.titlePlaceholder}
          autoComplete="off"
          className="h-12 text-base"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">{t.createPartyForm.dateLabel}</Label>
          <Input
            id="date"
            type="date"
            className="h-12 text-base"
            {...register("date")}
          />
          {errors.date && (
            <p className="text-sm text-destructive">{errors.date.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="time">{t.createPartyForm.timeLabel}</Label>
          <Input
            id="time"
            type="time"
            className="h-12 text-base"
            {...register("time")}
          />
          {errors.time && (
            <p className="text-sm text-destructive">{errors.time.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="location">{t.createPartyForm.locationLabel}</Label>
        <Input
          id="location"
          placeholder={t.createPartyForm.locationPlaceholder}
          autoComplete="off"
          className="h-12 text-base"
          {...register("location")}
        />
        {errors.location && (
          <p className="text-sm text-destructive">{errors.location.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">{t.createPartyForm.notesLabel}</Label>
        <Textarea
          id="notes"
          placeholder={t.createPartyForm.notesPlaceholder}
          className="min-h-24 text-base"
          {...register("notes")}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting} className="h-12 text-base">
        {isSubmitting ? t.createPartyForm.submitting : t.createPartyForm.submit}
      </Button>
    </form>
  );
}
