import { de } from "@/lib/i18n/dictionaries/de";
import { en } from "@/lib/i18n/dictionaries/en";
import type { Locale } from "@/lib/i18n/locales";

export type Dictionary = typeof de;

export const dictionaries: Record<Locale, Dictionary> = { de, en };
