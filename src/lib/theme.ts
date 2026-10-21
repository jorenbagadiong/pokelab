import { STORAGE_KEYS } from "@/constants/app";
import { createLocalStore } from "@/lib/storage/local-store";

export type Theme = "dark" | "light";

export const DEFAULT_THEME: Theme = "dark";

export function parseTheme(raw: string): Theme | null {
  return raw === "dark" || raw === "light" ? raw : null;
}

export const themeStore = createLocalStore<Theme>({
  key: STORAGE_KEYS.theme,
  fallback: DEFAULT_THEME,
  parse: parseTheme,
  serialize: (theme) => theme,
});

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement) {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

/**
 * Runs before first paint (inlined in <head>) so the stored theme is applied
 * without a flash, and marks whether entrance animations may run. Kept as a
 * plain string because it executes outside React.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){var d=document.documentElement;var t="${DEFAULT_THEME}";try{var s=localStorage.getItem("${STORAGE_KEYS.theme}");if(s==="dark"||s==="light")t=s;}catch(e){}d.dataset.theme=t;d.style.colorScheme=t;try{if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)d.dataset.motion="ok";}catch(e){}})();`;
