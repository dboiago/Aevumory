/**
 * Theme selection. Extracted from the former prototype theme-switcher
 * widget; themes are now chosen on the Settings screen (#settings).
 * The localStorage key is unchanged so an existing choice carries over.
 */

export const THEMES = ['overgrown', 'nebula', 'vernal', 'maritime', 'memoix'] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'overgrown';
const STORAGE_KEY = 'aevumory-prototype-theme';

export function getStoredTheme(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return THEMES.includes(stored as Theme) ? (stored as Theme) : DEFAULT_THEME;
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

/** Applies the stored theme (or the default) at startup. */
export function applyStoredTheme(): void {
  document.documentElement.dataset.theme = getStoredTheme();
}
