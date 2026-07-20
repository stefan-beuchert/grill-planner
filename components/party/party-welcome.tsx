"use client";

import { MapPin, Orbit } from "lucide-react";
import { NameForm } from "@/components/party/name-form";
import { useJoinParty } from "@/lib/hooks/use-join-party";
import { formatPartyDateTime } from "@/lib/party-datetime";
import { useI18n } from "@/lib/i18n/locale-context";
import type { Locale } from "@/lib/i18n/locales";

export function PartyWelcome({
  slug,
  title,
  startsAt,
  location,
  locale,
  onBrowse,
}: {
  slug: string;
  title: string;
  startsAt: Date;
  location: string;
  locale: Locale;
  onBrowse: () => void;
}) {
  const { t } = useI18n();
  const join = useJoinParty(slug);

  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 overflow-hidden px-4 py-10 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="flex flex-col items-center gap-4">
        <div className="bg-primary flex size-14 shrink-0 items-center justify-center rounded-full">
          <Orbit className="text-primary-foreground size-7" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-balance">{title}</h1>
          <p className="text-muted-foreground text-base font-medium">
            {formatPartyDateTime(startsAt, locale)}
          </p>
          <p className="text-muted-foreground flex items-center justify-center gap-1 text-sm">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <NameForm submitLabel={t.partyWelcome.joinSubmit} onSubmit={join} />
        <button
          type="button"
          onClick={onBrowse}
          className="text-muted-foreground self-center text-sm underline"
        >
          {t.partyWelcome.justLooking}
        </button>
      </div>
    </main>
  );
}
