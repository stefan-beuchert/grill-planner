"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { joinParty, updateParticipantName } from "@/lib/actions/participant";
import { setStoredParticipant } from "@/lib/participant-storage";
import {
  participantNameSchema,
  type ParticipantNameValues,
} from "@/lib/validations/participant";
import { SectionHeading } from "@/components/party/section-heading";
import { useI18n } from "@/lib/i18n/locale-context";

type Participant = {
  id: string;
  name: string;
};

function NameForm({
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
        <p className="text-sm text-destructive">
          {errors.name?.message ?? serverError}
        </p>
      )}
    </form>
  );
}

export function ParticipantsSection({
  slug,
  participants,
}: {
  slug: string;
  participants: Participant[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const stored = useStoredParticipant(slug);

  const me =
    stored && participants.find((p) => p.id === stored.participantId)
      ? participants.find((p) => p.id === stored.participantId)
      : null;

  async function handleJoin(name: string) {
    const result = await joinParty(slug, name);
    if (result.success) {
      setStoredParticipant(slug, {
        participantId: result.participantId,
        editToken: result.editToken,
      });
      router.refresh();
      return { success: true };
    }
    return { success: false, error: result.error };
  }

  async function handleRename(name: string) {
    if (!stored) return { success: false, error: t.common.joinFirst };
    const result = await updateParticipantName(
      slug,
      stored.participantId,
      stored.editToken,
      name,
    );
    if (result.success) {
      setEditing(false);
      router.refresh();
    }
    return result;
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading icon={Users}>{t.participants.heading}</SectionHeading>

      {participants.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.participants.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {participants.map((p) => (
            <li
              key={p.id}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-2.5 text-base transition-colors",
                me?.id === p.id && "border-primary/30 bg-accent",
              )}
            >
              <span className="flex items-center gap-2">
                {p.name}
                {me?.id === p.id && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    {t.participants.you}
                  </span>
                )}
              </span>
              {me?.id === p.id && !editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-muted-foreground text-sm underline"
                >
                  {t.participants.rename}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {me && editing && (
        <NameForm
          submitLabel={t.participants.saveSubmit}
          defaultName={me.name}
          onSubmit={handleRename}
        />
      )}

      {!me && <NameForm submitLabel={t.participants.joinSubmit} onSubmit={handleJoin} />}
    </div>
  );
}
