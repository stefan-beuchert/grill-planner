import { Flame } from "lucide-react";
import { formatPartyDateTime } from "@/lib/party-datetime";
import type { Locale } from "@/lib/i18n/locales";

export function PartyHeader({
  title,
  startsAt,
  locale,
}: {
  title: string;
  startsAt: Date;
  locale: Locale;
}) {
  return (
    <div className="bg-primary sticky top-0 z-10 -mx-4 flex items-center gap-2.5 px-4 py-3">
      <div className="bg-primary-foreground/15 flex size-8 shrink-0 items-center justify-center rounded-full">
        <Flame className="text-primary-foreground size-4" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-primary-foreground truncate text-sm font-semibold">{title}</span>
        <span className="text-primary-foreground/80 truncate text-xs">
          {formatPartyDateTime(startsAt, locale)}
        </span>
      </div>
    </div>
  );
}
