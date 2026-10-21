import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { AnimatedText } from "@/components/ui/animated-text";
import { ExplorerSkeleton } from "@/features/pokedex/explorer-skeleton";
import { PokedexExplorer } from "@/features/pokedex/pokedex-explorer";
import { getPokedexIndex } from "@/lib/api/pokeapi";

export const metadata: Metadata = {
  title: "Pokédex",
  description: "Search, filter and sort every Pokémon in the National Pokédex.",
};

export default async function PokedexPage() {
  // Lightweight index (number, name, types) for all species; no per-Pokémon detail requests.
  const index = await getPokedexIndex();

  return (
    <PageContainer className="pt-10 sm:pt-14">
      <header className="mb-8 max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">National Pokédex</p>
        <AnimatedText as="h1" trigger="mount" text="Explore every Pokémon" className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl" />
        <p className="mt-3 text-muted">
          {index.length.toLocaleString("en")} species from PokéAPI. Search by name or number, filter by type, and save your
          favorites.
        </p>
      </header>
      {/* The explorer reads URL search params, so it renders on the client inside this boundary. */}
      <Suspense fallback={<ExplorerSkeleton />}>
        <PokedexExplorer index={index} />
      </Suspense>
    </PageContainer>
  );
}
