import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { formatPartyDateTime } from "@/lib/party-datetime";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { AdminPartyList } from "@/components/admin/admin-party-list";
import { LocaleToggle } from "@/components/locale-toggle";
import { getLocale } from "@/lib/i18n/get-locale";
import { dictionaries } from "@/lib/i18n/dictionaries";

export default async function AdminPage() {
  const locale = await getLocale();
  const t = dictionaries[locale];
  const admin = await isAdmin();

  if (!admin) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t.admin.heading}</h1>
          <LocaleToggle />
        </div>
        <AdminLoginForm />
      </main>
    );
  }

  const parties = await prisma.party.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      startsAt: true,
      _count: { select: { participants: true } },
    },
  });

  const rows = parties.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    when: formatPartyDateTime(p.startsAt, locale),
    participantCount: p._count.participants,
  }));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t.admin.heading}</h1>
        <div className="flex items-center gap-3">
          <LocaleToggle />
          <AdminLogoutButton />
        </div>
      </div>
      <AdminPartyList parties={rows} />
    </main>
  );
}
