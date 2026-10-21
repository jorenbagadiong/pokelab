"use client";

import { useMemo, useState } from "react";
import { Heart, Trash2 } from "lucide-react";
import type { PokemonSummary } from "@/types/pokemon";
import { useFavorites } from "@/hooks/use-favorites";
import { useReveal } from "@/hooks/use-reveal";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/states";
import { PokemonCard, PokemonCardSkeleton } from "@/components/pokemon/pokemon-card";

/** Resolves stored ids against the index, newest first, skipping unknown ids. */
export function resolveFavorites(ids: readonly number[], index: PokemonSummary[]): PokemonSummary[] {
  const byId = new Map(index.map((p) => [p.id, p]));
  return [...ids].reverse().flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });
}

export function FavoritesView({ index }: { index: PokemonSummary[] }) {
  const { ids, ready, clear } = useFavorites();
  const [confirming, setConfirming] = useState(false);
  const favorites = useMemo(() => resolveFavorites(ids, index), [ids, index]);
  const gridRef = useReveal<HTMLUListElement>("[data-card]", [ready], { step: 35 });

  if (!ready) {
    return (
      <div role="status" aria-label="Loading favorites" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <PokemonCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="size-6" aria-hidden="true" />}
        title="No favorites yet"
        description="Tap the heart on any Pokémon to save it here. Favorites are stored in this browser."
        action={<ButtonLink href="/pokemon">Browse the Pokédex</ButtonLink>}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {favorites.length} saved Pokémon
        </p>
        {confirming ? (
          <div className="flex items-center gap-2" role="group" aria-label="Confirm clearing favorites">
            <span className="text-sm text-muted">Remove all favorites?</span>
            <Button
              size="sm"
              variant="secondary"
              className="border-danger/50 text-danger"
              onClick={() => {
                clear();
                setConfirming(false);
              }}
            >
              Remove all
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Clear all
          </Button>
        )}
      </div>
      <ul ref={gridRef} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {favorites.map((pokemon) => (
          <li key={pokemon.id}>
            <PokemonCard pokemon={pokemon} />
          </li>
        ))}
      </ul>
    </div>
  );
}
