import { cookies } from "next/headers";
import { DEFAULT_THEME, THEME_COOKIE, isTheme, type Theme } from "@/lib/theme";

// Server-only: reads the visitor's own theme preference. No system-preference
// detection — the app defaults to light until someone explicitly switches, so
// there's never a server/client mismatch to reconcile.
export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}
