"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { applyTheme, themeStore, type Theme } from "@/lib/theme";

export function useTheme() {
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.getServerSnapshot);

  // The bootstrap script applies the stored theme before paint. Afterwards,
  // apply only actual changes (including ones made in other tabs) — applying
  // on mount would briefly apply the server snapshot during hydration.
  useEffect(() => themeStore.subscribe(() => applyTheme(themeStore.get())), []);

  const setTheme = useCallback((next: Theme) => themeStore.set(next), []);
  const toggleTheme = useCallback(() => themeStore.set((prev) => (prev === "dark" ? "light" : "dark")), []);

  return { theme, setTheme, toggleTheme };
}
