import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { PRERENDERED_POKEMON_COUNT } from "@/constants/app";
import { findPokemon, getPokedexIndex } from "@/lib/api/pokeapi";
import { formatDexNumber } from "@/lib/utils/format";
import { DetailSkeleton } from "@/features/pokemon-detail/detail-skeleton";
import { loadPokemonPage } from "@/features/pokemon-detail/load-pokemon-page";
import { PokemonDetailView } from "@/features/pokemon-detail/pokemon-detail-view";

/** Prerender the first generation; other Pokémon render on first visit and are then cached. */
export async function generateStaticParams() {
  const index = await getPokedexIndex();
  return index.slice(0, PRERENDERED_POKEMON_COUNT).map((pokemon) => ({ name: pokemon.slug }));
}

export async function generateMetadata({ params }: PageProps<"/pokemon/[name]">): Promise<Metadata> {
  const { name } = await params;
  const entry = await findPokemon(name);
  if (!entry) return { title: "Pokémon not found", robots: { index: false } };
  return {
    title: `${entry.name} ${formatDexNumber(entry.id)}`,
    description: `${entry.name} (${formatDexNumber(entry.id)}): stats, abilities, evolutions, moves and artwork from PokéAPI.`,
    alternates: { canonical: `/pokemon/${entry.slug}` },
  };
}

async function PokemonDetailContent({ params }: Pick<PageProps<"/pokemon/[name]">, "params">) {
  const { name } = await params;
  const result = await loadPokemonPage(name);
  if (result.kind === "not-found") notFound();
  if (result.kind === "redirect") permanentRedirect(result.to);
  return <PokemonDetailView detail={result.detail} prev={result.prev} next={result.next} />;
}

export default function PokemonPage({ params }: PageProps<"/pokemon/[name]">) {
  // `params` is awaited inside the boundary so unlisted Pokémon get an instant shell.
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PokemonDetailContent params={params} />
    </Suspense>
  );
}
