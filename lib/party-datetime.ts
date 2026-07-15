import type { Locale } from "@/lib/i18n/locales";

// A party has one physical location and no notion of attendee timezones, so
// we deliberately don't do real timezone conversion. `date` + `time` are
// pinned to UTC on the way in and read back out with `timeZone: "UTC"` so
// every viewer sees the exact wall-clock time the organizer typed, no
// matter what timezone their own device is set to.

export function combineDateAndTimeUtc(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000Z`);
}

const INTL_LOCALES: Record<Locale, string> = {
  de: "de-DE",
  en: "en-US",
  es: "es-MX",
};

export function formatPartyDateTime(startsAt: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(startsAt);
}
