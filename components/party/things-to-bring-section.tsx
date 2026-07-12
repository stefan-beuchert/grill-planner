"use client";

import { Gift } from "lucide-react";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { ContributionList, type ContributionItem } from "@/components/party/contribution-list";
import { AddItemForm } from "@/components/party/add-item-form";
import { SectionHeading } from "@/components/party/section-heading";
import { useI18n } from "@/lib/i18n/locale-context";
import { ItemListType } from "@/lib/generated/prisma/enums";

export function ThingsToBringSection({
  slug,
  items,
  isAdmin = false,
}: {
  slug: string;
  items: ContributionItem[];
  isAdmin?: boolean;
}) {
  const { t } = useI18n();
  const stored = useStoredParticipant(slug);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading icon={Gift}>{t.thingsToBring.heading}</SectionHeading>
      <p className="text-muted-foreground text-sm">{t.thingsToBring.hint}</p>

      <ContributionList
        slug={slug}
        items={items}
        emptyText={t.thingsToBring.empty}
        joinPrompt={t.thingsToBring.joinPrompt}
        isAdmin={isAdmin}
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
