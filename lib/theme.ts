import type { Theme } from "@/stores/ui-store";

/**
 * Resolves the effective theme based on user preference and system settings
 */
export function getEffectiveTheme(theme: Theme): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";

  // System theme
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

/**
 * Check if current effective theme is dark mode
 */
export function isDarkMode(theme: Theme): boolean {
  return getEffectiveTheme(theme) === "dark";
}

/**
 * Get Monaco editor theme based on app theme
 */
export function getMonacoTheme(theme: Theme): "vs-dark" | "light" {
  return getEffectiveTheme(theme) === "dark" ? "vs-dark" : "light";
}
