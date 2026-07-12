import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  HandPlatter,
  MapPin,
  NotebookPen,
  ShoppingBasket,
  ShoppingCart,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPartyDateTime } from "@/lib/party-datetime";
import { CopyLinkButton } from "@/components/party/copy-link-button";
import { ParticipantsSection } from "@/components/party/participants-section";
import { SharedPurchasesSection } from "@/components/party/shared-purchases-section";
import { ThingsToBringSection } from "@/components/party/things-to-bring-section";
import { RideSection } from "@/components/party/ride-section";
import { ShoppingListSection } from "@/components/party/shopping-list-section";
import { LocationSection } from "@/components/party/location-section";
import { PartyHeader } from "@/components/party/party-header";
import { AiSummary } from "@/components/party/ai-summary";
import { AdminPartyControls } from "@/components/admin/admin-party-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { isAdmin } from "@/lib/admin-auth";

export default async function PartyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = dictionaries[locale];
  const admin = await isAdmin();

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
        },
        orderBy: { createdAt: "asc" },
      },
      items: {
        select: {
          id: true,
          name: true,
          listType: true,
          category: true,
          purchased: true,
          purchasedByParticipantId: true,
          purchasedBy: { select: { name: true } },
          contributions: {
            select: {
              participantId: true,
              quantity: true,
              participant: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!party) {
    notFound();
  }

  const items = party.items.map((item) => ({
    id: item.id,
    name: item.name,
    listType: item.listType,
    category: item.category,
    purchased: item.purchased,
    purchasedByParticipantId: item.purchasedByParticipantId,
    purchasedByName: item.purchasedBy?.name ?? null,
    contributions: item.contributions.map((c) => ({
      participantId: c.participantId,
      quantity: c.quantity,
      participantName: c.participant.name,
    })),
  }));

  const sharedPurchaseItems = items
    .filter((i) => i.listType === "SHARED_PURCHASE")
    .map((i) => ({ ...i, category: i.category! }));
  const bringItems = items.filter((i) => i.listType === "BRING_YOUR_OWN");
  const shoppingItems = sharedPurchaseItems.map((i) => ({
    id: i.id,
    name: i.name,
    purchased: i.purchased,
    purchasedByParticipantId: i.purchasedByParticipantId,
    purchasedByName: i.purchasedByName,
    total: i.contributions.reduce((sum, c) => sum + c.quantity, 0),
  }));

  const tabs = [
    { value: "guests", label: t.partyPage.tabs.guests, icon: Users },
    { value: "purchases", label: t.partyPage.tabs.purchases, icon: ShoppingBasket },
    { value: "bringing", label: t.partyPage.tabs.bringing, icon: HandPlatter },
    { value: "shopping", label: t.partyPage.tabs.shopping, icon: ShoppingCart },
    { value: "location", label: t.partyPage.tabs.location, icon: MapPin },
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-3 pb-28 sm:pt-3">
      <PartyHeader title={party.title} startsAt={party.startsAt} locale={locale} />
      <Tabs defaultValue="guests" className="gap-0">
        <TabsContent value="purchases">
          <SharedPurchasesSection
            slug={party.slug}
            items={sharedPurchaseItems}
            note={party.note}
            isAdmin={admin}
          />
        </TabsContent>

        <TabsContent value="bringing">
          <ThingsToBringSection
            slug={party.slug}
            items={bringItems}
            bringNote={party.bringNote}
            isAdmin={admin}
          />
        </TabsContent>

        <TabsContent value="guests" className="flex flex-col gap-6">
          <AiSummary
            slug={party.slug}
            recap={party.aiSummaryRecap}
            openPoints={party.aiSummaryOpenPoints}
            generatedAt={party.aiSummaryGeneratedAt}
          />
          {admin && (
            <AdminPartyControls
              slug={party.slug}
              partyId={party.id}
              defaultValues={{
                title: party.title,
                date: party.startsAt.toISOString().slice(0, 10),
                time: party.startsAt.toISOString().slice(11, 16),
                location: party.location,
                notes: party.notes ?? "",
              }}
            />
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {t.partyPage.when}
              </div>
              <CardTitle className="text-base font-normal">
                {formatPartyDateTime(party.startsAt, locale)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-base">
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

          <ParticipantsSection
            slug={party.slug}
            participants={party.participants}
            isAdmin={admin}
          />

          <div className="flex flex-col gap-2">
            <CopyLinkButton />
            <p className="text-muted-foreground text-center text-sm">{t.partyPage.shareHint}</p>
          </div>
        </TabsContent>

        <TabsContent value="location" className="flex flex-col gap-6">
          <RideSection slug={party.slug} participants={party.participants} />
          <Suspense
            fallback={<p className="text-muted-foreground text-sm">{t.partyPage.loadingLocation}</p>}
          >
            <LocationSection location={party.location} startsAt={party.startsAt} t={t} />
          </Suspense>
        </TabsContent>

        <TabsContent value="shopping">
          <ShoppingListSection
            slug={party.slug}
            items={shoppingItems}
            note={party.note}
            isAdmin={admin}
          />
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
