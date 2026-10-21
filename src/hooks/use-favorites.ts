"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { favoritesStore, toggleId } from "@/features/favorites/favorites-store";
import { useIsClient } from "./use-is-client";

export function useFavorites() {
  const ids = useSyncExternalStore(favoritesStore.subscribe, favoritesStore.get, favoritesStore.getServerSnapshot);
  const ready = useIsClient();
  const set = useMemo(() => new Set(ids), [ids]);

  const toggle = useCallback((id: number) => favoritesStore.set((prev) => toggleId(prev, id)), []);
  const isFavorite = useCallback((id: number) => set.has(id), [set]);
  const clear = useCallback(() => favoritesStore.set([]), []);

  return { ids, isFavorite, toggle, clear, ready };
}
