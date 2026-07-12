"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { useJoinParty } from "@/lib/hooks/use-join-party";
import { updateParticipantName } from "@/lib/actions/participant";
import { adminRemoveGuest } from "@/lib/actions/admin";
import { NameForm } from "@/components/party/name-form";
import { SectionHeading } from "@/components/party/section-heading";
import { useI18n } from "@/lib/i18n/locale-context";

type Participant = {
  id: string;
  name: string;
};

export function ParticipantsSection({
  slug,
  participants,
  isAdmin = false,
}: {
  slug: string;
  participants: Participant[];
  isAdmin?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const stored = useStoredParticipant(slug);
  const join = useJoinParty(slug);

  const me =
    stored && participants.find((p) => p.id === stored.participantId)
      ? participants.find((p) => p.id === stored.participantId)
      : null;

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

  async function handleRemove(id: string, name: string) {
    if (!window.confirm(t.admin.removeGuestConfirm(name))) return;
    setPendingId(id);
    await adminRemoveGuest(slug, id);
    setPendingId(null);
    router.refresh();
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
              <div className="flex items-center gap-3">
                {me?.id === p.id && !editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-muted-foreground text-sm underline"
                  >
                    {t.participants.rename}
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    disabled={pendingId === p.id}
                    onClick={() => handleRemove(p.id, p.name)}
                    className="text-destructive text-sm underline"
                  >
                    {t.admin.removeGuest}
                  </button>
                )}
              </div>
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

      {!me && <NameForm submitLabel={t.participants.joinSubmit} onSubmit={join} />}
    </div>
  );
}
