export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "light";
export const THEME_COOKIE = "theme";

export function isTheme(value: string | undefined): value is Theme {
  return !!value && (THEMES as readonly string[]).includes(value);
}
