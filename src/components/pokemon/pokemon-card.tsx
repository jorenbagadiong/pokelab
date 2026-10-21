import Link from "next/link";
import { typeColor } from "@/constants/types";
import type { PokemonSummary } from "@/types/pokemon";
import { officialArtworkUrl } from "@/lib/utils/artwork";
import { formatDexNumber } from "@/lib/utils/format";
import { TypeBadge } from "@/components/ui/badge";
import { FavoriteButton } from "./favorite-button";
import { PokemonImage } from "./pokemon-image";

interface PokemonCardProps {
  pokemon: PokemonSummary;
  /** Artwork URL from PokéAPI when available; otherwise the sprite repository fallback is used. */
  artwork?: string | null;
  preload?: boolean;
}

export function PokemonCard({ pokemon, artwork, preload = false }: PokemonCardProps) {
  const color = typeColor(pokemon.types[0]);
  const src = artwork === undefined ? officialArtworkUrl(pokemon.id) : artwork;

  return (
    <article className="group relative" data-card>
      <Link
        href={`/pokemon/${pokemon.slug}`}
        className="block overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-[translate,border-color,box-shadow] duration-300 ease-out-quart hover:-translate-y-1 hover:border-border-strong hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <div
          className="relative aspect-square"
          style={{ background: `radial-gradient(90% 70% at 50% 35%, ${color}38, transparent 72%)` }}
        >
          <PokemonImage
            src={src}
            alt={pokemon.name}
            sizes="(min-width: 1280px) 220px, (min-width: 768px) 30vw, 45vw"
            preload={preload}
            className="p-5 transition-transform duration-500 ease-out-quart group-hover:scale-105"
          />
        </div>
        <div className="space-y-2 border-t border-border px-4 pb-4 pt-3">
          <p className="font-mono text-xs tabular-nums text-subtle">{formatDexNumber(pokemon.id)}</p>
          <h3 className="truncate font-display text-base font-semibold text-text">{pokemon.name}</h3>
          <div className="flex flex-wrap gap-1.5">
            {pokemon.types.length > 0 ? (
              pokemon.types.map((type) => <TypeBadge key={type} type={type} />)
            ) : (
              <span className="text-xs text-subtle">Type unknown</span>
            )}
          </div>
        </div>
      </Link>
      <div className="absolute right-3 top-3">
        <FavoriteButton id={pokemon.id} name={pokemon.name} />
      </div>
    </article>
  );
}

export function PokemonCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface" aria-hidden="true">
      <div className="flex aspect-square items-center justify-center p-8">
        <div className="skeleton size-full rounded-full opacity-60" />
      </div>
      <div className="space-y-2.5 border-t border-border px-4 pb-4 pt-3">
        <div className="skeleton h-3 w-12 rounded" />
        <div className="skeleton h-4 w-28 rounded" />
        <div className="flex gap-1.5">
          <div className="skeleton h-5 w-14 rounded-full" />
          <div className="skeleton h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}
