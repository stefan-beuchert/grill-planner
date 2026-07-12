"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminUpdateParty, adminCancelParty } from "@/lib/actions/admin";
import { partyFormSchema, type PartyFormValues } from "@/lib/validations/party";
import { useI18n } from "@/lib/i18n/locale-context";

export function AdminPartyControls({
  slug,
  partyId,
  defaultValues,
}: {
  slug: string;
  partyId: string;
  defaultValues: PartyFormValues;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => partyFormSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PartyFormValues>({ resolver: zodResolver(schema), defaultValues });

  async function onSubmit(values: PartyFormValues) {
    setServerError(null);
    const result = await adminUpdateParty(slug, partyId, values);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleCancelParty() {
    if (!window.confirm(t.admin.cancelPartyConfirm)) return;
    await adminCancelParty(partyId);
  }

  return (
    <div className="border-destructive/30 flex flex-col gap-3 rounded-xl border p-3">
      <span className="text-destructive text-xs font-semibold tracking-wide uppercase">
        {t.admin.badge}
      </span>

      {!editing ? (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            {t.admin.editDetails}
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={handleCancelParty}>
            {t.admin.cancelParty}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-title">{t.createPartyForm.titleLabel}</Label>
            <Input id="admin-title" className="h-11" {...register("title")} />
            {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-date">{t.createPartyForm.dateLabel}</Label>
              <Input id="admin-date" type="date" className="h-11" {...register("date")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-time">{t.createPartyForm.timeLabel}</Label>
              <Input id="admin-time" type="time" className="h-11" {...register("time")} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-location">{t.createPartyForm.locationLabel}</Label>
            <Input id="admin-location" className="h-11" {...register("location")} />
            {errors.location && (
              <p className="text-destructive text-sm">{errors.location.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-notes">{t.createPartyForm.notesLabel}</Label>
            <Textarea id="admin-notes" className="min-h-20" {...register("notes")} />
          </div>
          {serverError && <p className="text-destructive text-sm">{serverError}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} size="sm">
              {t.admin.saveDetails}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
              {t.common.cancel}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
