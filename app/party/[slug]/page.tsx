import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HandPlatter, MapPin, Receipt, ShoppingCart, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CopyLinkButton } from "@/components/party/copy-link-button";
import { ParticipantsSection } from "@/components/party/participants-section";
import { ThingsToBringSection } from "@/components/party/things-to-bring-section";
import { RideSection } from "@/components/party/ride-section";
import { ShoppingListSection } from "@/components/party/shopping-list-section";
import { LocationSection } from "@/components/party/location-section";
import { ReceiptSection } from "@/components/party/receipt-section";
import { PartyHeader } from "@/components/party/party-header";
import { PartyShell } from "@/components/party/party-shell";
import { AiSummary } from "@/components/party/ai-summary";
import { GeneralNote } from "@/components/party/general-note";
import { LocationNote } from "@/components/party/location-note";
import { AdminPartyControls } from "@/components/admin/admin-party-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { isAdmin } from "@/lib/admin-auth";
import { getTheme } from "@/lib/get-theme";

export default async function PartyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const theme = await getTheme();
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
      receipts: {
        select: {
          id: true,
          store: true,
          scannedBy: { select: { name: true } },
          lineItems: {
            select: { id: true, name: true, priceCents: true, quantity: true },
            orderBy: { position: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
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

  const receipts = party.receipts.map((receipt) => ({
    id: receipt.id,
    store: receipt.store,
    scannedByName: receipt.scannedBy?.name ?? null,
    lineItems: receipt.lineItems,
  }));

  const tabs = [
    { value: "location", label: t.partyPage.tabs.location, icon: MapPin },
    { value: "bringing", label: t.partyPage.tabs.bringing, icon: HandPlatter },
    { value: "guests", label: t.partyPage.tabs.guests, icon: Users },
    { value: "shopping", label: t.partyPage.tabs.shopping, icon: ShoppingCart },
    { value: "receipts", label: t.partyPage.tabs.receipts, icon: Receipt },
  ] as const;

  return (
    <PartyShell
      slug={party.slug}
      title={party.title}
      startsAt={party.startsAt}
      location={party.location}
      locale={locale}
    >
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-3 pb-28 sm:pt-3">
        <PartyHeader title={party.title} startsAt={party.startsAt} locale={locale} theme={theme} />
        <Tabs defaultValue="guests" className="gap-0">
          <TabsContent value="bringing" className="animate-in fade-in duration-200">
            <ThingsToBringSection
              slug={party.slug}
              items={bringItems}
              bringNote={party.bringNote}
              isAdmin={admin}
            />
          </TabsContent>

          <TabsContent value="guests" className="animate-in fade-in flex flex-col gap-6 duration-200">
            <AiSummary
              slug={party.slug}
              recap={party.aiSummaryRecap}
              openPoints={party.aiSummaryOpenPoints}
              generatedAt={party.aiSummaryGeneratedAt}
            />
            <AdminPartyControls
              slug={party.slug}
              partyId={party.id}
              isAdmin={admin}
              defaultValues={{
                title: party.title,
                date: party.startsAt.toISOString().slice(0, 10),
                time: party.startsAt.toISOString().slice(11, 16),
                location: party.location,
                notes: party.notes ?? "",
              }}
            />
            <GeneralNote slug={party.slug} notes={party.notes} />

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

          <TabsContent value="location" className="animate-in fade-in flex flex-col gap-6 duration-200">
            <LocationNote slug={party.slug} note={party.locationNote} />
            <RideSection slug={party.slug} participants={party.participants} />
            <Suspense
              fallback={<p className="text-muted-foreground text-sm">{t.partyPage.loadingLocation}</p>}
            >
              <LocationSection location={party.location} startsAt={party.startsAt} t={t} />
            </Suspense>
          </TabsContent>

          <TabsContent value="shopping" className="animate-in fade-in duration-200">
            <ShoppingListSection
              slug={party.slug}
              items={sharedPurchaseItems}
              note={party.note}
              isAdmin={admin}
            />
          </TabsContent>

          <TabsContent value="receipts" className="animate-in fade-in duration-200">
            <ReceiptSection slug={party.slug} receipts={receipts} />
          </TabsContent>

          <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background pb-[env(safe-area-inset-bottom)]">
            <TabsList className="mx-auto !h-auto w-full max-w-md justify-between gap-0 rounded-none bg-transparent p-0">
              {tabs.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-auto flex-1 flex-col gap-1 rounded-none border-0 py-3 text-[11px] font-medium text-muted-foreground after:hidden data-active:bg-transparent data-active:text-primary"
                >
                  {value === "guests" ? (
                    <span className="bg-primary flex size-8 items-center justify-center rounded-full">
                      <Icon className="size-5 text-primary-foreground" aria-hidden="true" />
                    </span>
                  ) : (
                    <Icon className="size-6" aria-hidden="true" />
                  )}
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </main>
    </PartyShell>
  );
}
