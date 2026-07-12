import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  Beer,
  CalendarDays,
  Flame,
  MapPin,
  NotebookPen,
  ShoppingCart,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPartyDateTime } from "@/lib/party-datetime";
import { CopyLinkButton } from "@/components/party/copy-link-button";
import { ParticipantsSection } from "@/components/party/participants-section";
import { FoodSection } from "@/components/party/food-section";
import { DrinksSection } from "@/components/party/drinks-section";
import { RideSection } from "@/components/party/ride-section";
import { ShoppingListSection } from "@/components/party/shopping-list-section";
import { LocationSection } from "@/components/party/location-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";

export default async function PartyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = dictionaries[locale];

  const party = await prisma.party.findUnique({
    where: { slug },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          isDriver: true,
          seatsFree: true,
          needsRide: true,
          drinkSelections: { select: { type: true, quantity: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      foodItems: {
        select: {
          id: true,
          name: true,
          selections: { select: { participantId: true, quantity: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!party) {
    notFound();
  }

  const drinkSelections = party.participants.flatMap((p) =>
    p.drinkSelections.map((d) => ({ participantId: p.id, ...d })),
  );

  const tabs = [
    { value: "guests", label: t.partyPage.tabs.guests, icon: Users },
    { value: "food", label: t.partyPage.tabs.food, icon: UtensilsCrossed },
    { value: "drinks", label: t.partyPage.tabs.drinks, icon: Beer },
    { value: "shopping", label: t.partyPage.tabs.shopping, icon: ShoppingCart },
    { value: "location", label: t.partyPage.tabs.location, icon: MapPin },
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8 pb-28 sm:pt-12">
      <Tabs defaultValue="guests" className="gap-0">
        <TabsContent value="guests" className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Flame className="size-5 text-primary" aria-hidden="true" />
                </div>
                <CardTitle className="text-2xl">{party.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-base">
              <div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  {t.partyPage.when}
                </div>
                <div>{formatPartyDateTime(party.startsAt, locale)}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {t.partyPage.where}
                </div>
                <div>{party.location}</div>
              </div>
              {party.notes && (
                <div>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                    <NotebookPen className="size-3.5" aria-hidden="true" />
                    {t.partyPage.notes}
                  </div>
                  <div className="whitespace-pre-wrap">{party.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <CopyLinkButton />
            <p className="text-muted-foreground text-center text-sm">{t.partyPage.shareHint}</p>
          </div>

          <ParticipantsSection slug={party.slug} participants={party.participants} />
        </TabsContent>

        <TabsContent value="food">
          <FoodSection slug={party.slug} foodItems={party.foodItems} />
        </TabsContent>

        <TabsContent value="drinks">
          <DrinksSection slug={party.slug} drinkSelections={drinkSelections} />
        </TabsContent>

        <TabsContent value="shopping">
          <ShoppingListSection
            foodItems={party.foodItems}
            drinkSelections={drinkSelections}
            t={t}
          />
        </TabsContent>

        <TabsContent value="location" className="flex flex-col gap-6">
          <RideSection slug={party.slug} participants={party.participants} />
          <Suspense
            fallback={<p className="text-muted-foreground text-sm">{t.partyPage.loadingLocation}</p>}
          >
            <LocationSection location={party.location} startsAt={party.startsAt} t={t} />
          </Suspense>
        </TabsContent>

        <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background pb-[env(safe-area-inset-bottom)]">
          <TabsList className="mx-auto h-auto w-full max-w-md justify-between gap-0 rounded-none bg-transparent p-0">
            {tabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-auto flex-1 flex-col gap-1 rounded-none border-0 py-2.5 text-[11px] font-medium text-muted-foreground after:hidden data-active:bg-transparent data-active:text-primary"
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </main>
  );
}
