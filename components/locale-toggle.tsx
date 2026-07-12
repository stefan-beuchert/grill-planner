"use client";

import { useI18n } from "@/lib/i18n/locale-context";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function LocaleToggle({
  variant = "default",
}: {
  variant?: "default" | "on-primary";
}) {
  const { locale, t, setLocale } = useI18n();
  const isEnglish = locale === "en";
  const onPrimary = variant === "on-primary";

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span
        className={cn(
          "text-xs font-medium",
          onPrimary
            ? isEnglish
              ? "text-primary-foreground/70"
              : "text-primary-foreground"
            : isEnglish
              ? "text-muted-foreground"
              : "text-foreground",
        )}
      >
        {t.localeToggle.german}
      </span>
      <Switch
        checked={isEnglish}
        onCheckedChange={(checked) => setLocale(checked ? "en" : "de")}
        aria-label={t.localeToggle.label}
        className={
          onPrimary
            ? "data-checked:bg-primary-foreground/40 data-unchecked:bg-primary-foreground/20"
            : undefined
        }
      />
      <span
        className={cn(
          "text-xs font-medium",
          onPrimary
            ? isEnglish
              ? "text-primary-foreground"
              : "text-primary-foreground/70"
            : isEnglish
              ? "text-foreground"
              : "text-muted-foreground",
        )}
      >
        {t.localeToggle.english}
      </span>
    </div>
  );
}
