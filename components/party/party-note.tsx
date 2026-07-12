"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { useI18n } from "@/lib/i18n/locale-context";

type SaveNote = (
  slug: string,
  participantId: string,
  editToken: string,
  note: string,
) => Promise<{ success: boolean; error?: string }>;

export function PartyNote({
  slug,
  note,
  label,
  addLabel,
  editLabel,
  placeholder,
  save,
}: {
  slug: string;
  note: string | null;
  label: string;
  addLabel: string;
  editLabel: string;
  placeholder: string;
  save: SaveNote;
}) {
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
          {addLabel}
        </button>
      );
    }
    return (
      <div className="bg-muted/50 flex flex-col gap-1 rounded-xl p-3">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <NotebookPen className="size-3.5" aria-hidden="true" />
          {label}
        </div>
        <p className="text-sm whitespace-pre-wrap">{note}</p>
        {stored && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-muted-foreground self-start text-xs underline"
          >
            {editLabel}
          </button>
        )}
      </div>
    );
  }

  async function onSave() {
    if (!stored) return;
    setSaving(true);
    setError(null);
    const result = await save(slug, stored.participantId, stored.editToken, value);
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? null);
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
        placeholder={placeholder}
        className="text-base"
        maxLength={300}
        rows={3}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" disabled={saving} onClick={onSave} className="h-10">
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
