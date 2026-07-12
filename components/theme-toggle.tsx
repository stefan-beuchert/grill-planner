"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { THEME_COOKIE, type Theme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n/locale-context";

export function ThemeToggle({
  theme: initialTheme,
  variant = "default",
}: {
  theme: Theme;
  variant?: "default" | "on-primary";
}) {
  const { t } = useI18n();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const onPrimary = variant === "on-primary";

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setTheme(next);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? t.themeToggle.switchToLight : t.themeToggle.switchToDark}
      className={cn(
        onPrimary &&
          "text-primary-foreground/80 hover:bg-primary-foreground/15 hover:text-primary-foreground",
      )}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
