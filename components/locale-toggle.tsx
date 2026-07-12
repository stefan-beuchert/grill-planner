"use client";

import { useI18n } from "@/lib/i18n/locale-context";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function LocaleToggle() {
  const { locale, t, setLocale } = useI18n();
  const isEnglish = locale === "en";

  return (
    <div className="fixed top-3 right-3 z-20 flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 shadow-sm backdrop-blur">
      <span
        className={cn(
          "text-xs font-medium",
          isEnglish ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {t.localeToggle.german}
      </span>
      <Switch
        checked={isEnglish}
        onCheckedChange={(checked) => setLocale(checked ? "en" : "de")}
        aria-label={t.localeToggle.label}
      />
      <span
        className={cn(
          "text-xs font-medium",
          isEnglish ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {t.localeToggle.english}
      </span>
    </div>
  );
}
