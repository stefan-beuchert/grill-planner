"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { setPartyNote } from "@/lib/actions/party";
import { useI18n } from "@/lib/i18n/locale-context";

export function PartyNote({ slug, note }: { slug: string; note: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const stored = useStoredParticipant(slug);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    if (!note) {
      if (!stored) return null;
      return (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-muted-foreground flex items-center gap-1.5 text-sm underline"
        >
          <NotebookPen className="size-3.5" aria-hidden="true" />
          {t.sharedPurchases.addNote}
        </button>
      );
    }
    return (
      <div className="bg-muted/50 flex flex-col gap-1 rounded-xl p-3">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <NotebookPen className="size-3.5" aria-hidden="true" />
          {t.sharedPurchases.noteLabel}
        </div>
        <p className="text-sm whitespace-pre-wrap">{note}</p>
        {stored && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-muted-foreground self-start text-xs underline"
          >
            {t.sharedPurchases.editNote}
          </button>
        )}
      </div>
    );
  }

  async function save() {
    if (!stored) return;
    setSaving(true);
    setError(null);
    const result = await setPartyNote(slug, stored.participantId, stored.editToken, value);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t.sharedPurchases.notePlaceholder}
        className="text-base"
        maxLength={300}
        rows={3}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" disabled={saving} onClick={save} className="h-10">
          {t.common.save}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => {
            setValue(note ?? "");
            setEditing(false);
          }}
          className="h-10"
        >
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}
