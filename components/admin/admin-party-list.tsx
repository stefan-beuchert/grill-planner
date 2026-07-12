"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { adminDeleteParty } from "@/lib/actions/admin";
import { useI18n } from "@/lib/i18n/locale-context";

export type AdminPartyRow = {
  id: string;
  slug: string;
  title: string;
  when: string;
  participantCount: number;
};

export function AdminPartyList({ parties }: { parties: AdminPartyRow[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(t.admin.deleteConfirm(title))) return;
    setPendingId(id);
    await adminDeleteParty(id);
    setPendingId(null);
    router.refresh();
  }

  if (parties.length === 0) {
    return <p className="text-muted-foreground text-sm">{t.admin.noParties}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {parties.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5"
        >
          <Link href={`/party/${p.slug}`} className="flex min-w-0 flex-col">
            <span className="truncate text-base">{p.title}</span>
            <span className="text-muted-foreground text-xs">
              {p.when} · {t.admin.participantsCount(p.participantCount)}
            </span>
          </Link>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pendingId === p.id}
            onClick={() => handleDelete(p.id, p.title)}
          >
            {t.admin.deleteParty}
          </Button>
        </li>
      ))}
    </ul>
  );
}
