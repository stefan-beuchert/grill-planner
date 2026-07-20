import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getLocale } from "@/lib/i18n/get-locale";
import { getTheme } from "@/lib/get-theme";
import { I18nProvider } from "@/lib/i18n/locale-context";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const METADATA_BY_LOCALE: Record<Locale, Metadata> = {
  de: { title: "Orbit", description: "Plane ein Event mit Freunden — kein Konto nötig." },
  en: { title: "Orbit", description: "Plan an event with friends — no account needed." },
  es: { title: "Orbit", description: "Organiza un evento con tus cuates — sin registro." },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return METADATA_BY_LOCALE[locale];
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const theme = await getTheme();

  return (
    <html
      lang={locale}
      className={cn(geistSans.variable, geistMono.variable, "h-full antialiased", theme === "dark" && "dark")}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
