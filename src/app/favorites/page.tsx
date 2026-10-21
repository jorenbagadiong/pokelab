import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { AnimatedText } from "@/components/ui/animated-text";
import { FavoritesView } from "@/features/favorites/favorites-view";
import { getPokedexIndex } from "@/lib/api/pokeapi";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Your saved Pokémon, stored in this browser.",
};

export default async function FavoritesPage() {
  const index = await getPokedexIndex();
  return (
    <PageContainer className="pt-10 sm:pt-14">
      <header className="mb-8 max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Your collection</p>
        <AnimatedText as="h1" trigger="mount" text="Favorites" className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl" />
        <p className="mt-3 text-muted">Pokémon you’ve saved. They’re kept in this browser’s local storage.</p>
      </header>
      <FavoritesView index={index} />
    </PageContainer>
  );
}
