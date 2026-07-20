import { Orbit } from "lucide-react";
import { formatPartyDateTime } from "@/lib/party-datetime";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Locale } from "@/lib/i18n/locales";
import type { Theme } from "@/lib/theme";

export function PartyHeader({
  title,
  startsAt,
  locale,
  theme,
}: {
  title: string;
  startsAt: Date;
  locale: Locale;
  theme: Theme;
}) {
  return (
    <div className="bg-primary sticky top-0 z-10 -mx-4 flex items-center gap-2.5 px-4 py-3">
      <div className="bg-primary-foreground/15 flex size-8 shrink-0 items-center justify-center rounded-full">
        <Orbit className="text-primary-foreground size-4" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-primary-foreground truncate text-base font-bold tracking-tight">
          {title}
        </span>
        <span className="text-primary-foreground/75 truncate text-xs font-medium">
          {formatPartyDateTime(startsAt, locale)}
        </span>
      </div>
      <ThemeToggle theme={theme} variant="on-primary" />
      <LocaleToggle variant="on-primary" />
    </div>
  );
}
