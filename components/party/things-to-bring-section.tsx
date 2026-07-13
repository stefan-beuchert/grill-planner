"use client";

import { HandPlatter } from "lucide-react";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { ContributionList, type ContributionItem } from "@/components/party/contribution-list";
import { AddItemForm } from "@/components/party/add-item-form";
import { SectionHeading } from "@/components/party/section-heading";
import { PartyNote } from "@/components/party/party-note";
import { setBringNote } from "@/lib/actions/party";
import { useI18n } from "@/lib/i18n/locale-context";
import { ItemListType } from "@/lib/generated/prisma/enums";

export function ThingsToBringSection({
  slug,
  items,
  bringNote,
  isAdmin = false,
}: {
  slug: string;
  items: ContributionItem[];
  bringNote: string | null;
  isAdmin?: boolean;
}) {
  const { t } = useI18n();
  const stored = useStoredParticipant(slug);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading icon={HandPlatter}>{t.thingsToBring.heading}</SectionHeading>
      <p className="text-muted-foreground text-sm">{t.thingsToBring.hint}</p>
      <PartyNote
        slug={slug}
        note={bringNote}
        label={t.thingsToBring.noteLabel}
        addLabel={t.thingsToBring.addNote}
        editLabel={t.thingsToBring.editNote}
        placeholder={t.thingsToBring.notePlaceholder}
        save={setBringNote}
      />

      <ContributionList
        slug={slug}
        items={items}
        emptyText={t.thingsToBring.empty}
        joinPrompt={t.thingsToBring.joinPrompt}
        isAdmin={isAdmin}
        listType={ItemListType.BRING_YOUR_OWN}
      />

      {stored && (
        <AddItemForm
          slug={slug}
          participantId={stored.participantId}
          editToken={stored.editToken}
          listType={ItemListType.BRING_YOUR_OWN}
          category={null}
          placeholder={t.thingsToBring.addPlaceholder}
          submitLabel={t.thingsToBring.addSubmit}
        />
      )}
    </div>
  );
}
