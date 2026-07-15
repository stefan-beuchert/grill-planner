"use client";

import { useI18n } from "@/lib/i18n/locale-context";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

const LABEL_KEY: Record<Locale, "german" | "english" | "spanish"> = {
  de: "german",
  en: "english",
  es: "spanish",
};

export function LocaleToggle({
  variant = "default",
}: {
  variant?: "default" | "on-primary";
}) {
  const { locale, t, setLocale } = useI18n();
  const onPrimary = variant === "on-primary";

  return (
    <div
      role="group"
      aria-label={t.localeToggle.label}
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-full p-0.5",
        onPrimary ? "bg-primary-foreground/15" : "bg-muted",
      )}
    >
      {LOCALES.map((value) => {
        const active = value === locale;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setLocale(value)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2 py-1 text-xs font-medium transition-colors",
              active
                ? onPrimary
                  ? "bg-primary-foreground text-primary"
                  : "bg-background text-foreground shadow-sm"
                : onPrimary
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground",
            )}
          >
            {t.localeToggle[LABEL_KEY[value]]}
          </button>
        );
      })}
    </div>
  );
}
