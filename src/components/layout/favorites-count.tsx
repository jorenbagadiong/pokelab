"use client";

import { useFavorites } from "@/hooks/use-favorites";

/** Small count bubble for the Favorites nav item. Renders nothing until hydrated. */
export function FavoritesCount() {
  const { ids, ready } = useFavorites();
  if (!ready || ids.length === 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-favorite/15 px-1.5 text-[0.6875rem] font-semibold tabular-nums text-favorite">
      {ids.length}
      <span className="sr-only"> saved</span>
    </span>
  );
}
