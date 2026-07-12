export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];

// German first: the app's primary/default audience.
export const DEFAULT_LOCALE: Locale = "de";
export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
