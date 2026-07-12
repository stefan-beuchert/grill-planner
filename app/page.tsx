import { Flame } from "lucide-react";
import { CreatePartyForm } from "@/components/party/create-party-form";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { getLocale } from "@/lib/i18n/get-locale";
import { getTheme } from "@/lib/get-theme";
import { dictionaries } from "@/lib/i18n/dictionaries";

export default async function Home() {
  const t = dictionaries[await getLocale()];
  const theme = await getTheme();

  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col gap-6 overflow-hidden px-4 py-8 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <Flame className="size-6 text-primary" aria-hidden="true" />
          </div>
          <h1 className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight">
            Grill Planner
          </h1>
          <ThemeToggle theme={theme} />
          <LocaleToggle />
        </div>
        <p className="text-muted-foreground text-base">{t.landing.tagline}</p>
      </div>
      <CreatePartyForm />
    </main>
  );
}
