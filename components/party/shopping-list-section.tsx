"use client";

import { ShoppingCart, UtensilsCrossed, Beer, Package } from "lucide-react";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { ContributionList, type ContributionItem } from "@/components/party/contribution-list";
import { AddItemForm } from "@/components/party/add-item-form";
import { CollapsibleSection } from "@/components/party/collapsible-section";
import { SectionHeading } from "@/components/party/section-heading";
import { SharedPurchasesNote } from "@/components/party/shared-purchases-note";
import { useI18n } from "@/lib/i18n/locale-context";
import { ItemCategory, ItemListType } from "@/lib/generated/prisma/enums";

export type ShoppingListItem = ContributionItem & { category: ItemCategory };

export function ShoppingListSection({
  slug,
  items,
  note,
  isAdmin = false,
}: {
  slug: string;
  items: ShoppingListItem[];
  note: string | null;
  isAdmin?: boolean;
}) {
  const { t } = useI18n();
  const stored = useStoredParticipant(slug);

  const byCategory = {
    FOOD: items.filter((i) => i.category === "FOOD"),
    DRINK: items.filter((i) => i.category === "DRINK"),
    OTHER: items.filter((i) => i.category === "OTHER"),
  };

  const categories: { key: ItemCategory; icon: typeof UtensilsCrossed; label: string }[] = [
    { key: "FOOD", icon: UtensilsCrossed, label: t.sharedPurchases.categories.food },
    { key: "DRINK", icon: Beer, label: t.sharedPurchases.categories.drink },
    { key: "OTHER", icon: Package, label: t.sharedPurchases.categories.other },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading icon={ShoppingCart}>{t.shoppingList.heading}</SectionHeading>
      <SharedPurchasesNote slug={slug} note={note} />

      {categories.map(({ key, icon, label }) => {
        const categoryItems = byCategory[key];
        return (
          <CollapsibleSection
            key={key}
            icon={icon}
            title={label}
            count={categoryItems.length}
            defaultOpen={key === "FOOD"}
          >
            <ContributionList
              slug={slug}
              items={categoryItems}
              emptyText={t.sharedPurchases.emptyCategory}
              joinPrompt={t.sharedPurchases.joinPrompt}
              isAdmin={isAdmin}
              canMarkPurchased
            />
            {stored && (
              <AddItemForm
                slug={slug}
                participantId={stored.participantId}
                editToken={stored.editToken}
                listType={ItemListType.SHARED_PURCHASE}
                category={key}
                placeholder={t.sharedPurchases.addPlaceholder}
                submitLabel={t.sharedPurchases.addSubmit}
              />
            )}
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
