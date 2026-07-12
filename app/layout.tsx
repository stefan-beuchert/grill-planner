import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getLocale } from "@/lib/i18n/get-locale";
import { getTheme } from "@/lib/get-theme";
import { I18nProvider } from "@/lib/i18n/locale-context";
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "de"
    ? { title: "Grill Planner", description: "Plane ein Grillfest mit Freunden — kein Konto nötig." }
    : { title: "Grill Planner", description: "Plan a BBQ with friends — no account needed." };
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
