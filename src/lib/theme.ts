export const THEME_STORAGE_KEY = "taskboard_theme";
export type Theme = "light" | "dark";

export function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}
