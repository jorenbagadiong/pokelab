import Link from "next/link";
import { ArrowRight, Box, Heart, Layers } from "lucide-react";
import { FEATURED_POKEMON_IDS, HERO_COMPANION_IDS, HERO_POKEMON_ID } from "@/constants/app";
import { POKEMON_TYPES, TYPE_PALETTE } from "@/constants/types";
import { SHOWCASE_POKEMON_SLUG } from "@/constants/showcase";
import { getFeaturedPokemon, getPokedexIndex } from "@/lib/api/pokeapi";
import { titleCase } from "@/lib/utils/format";
import { PageContainer } from "@/components/layout/page-container";
import { ButtonLink } from "@/components/ui/button";
import { TypeBadge } from "@/components/ui/badge";
import { AnimatedText } from "@/components/ui/animated-text";
import { RevealGroup } from "@/components/ui/reveal-group";
import { SectionHeading, Surface } from "@/components/ui/surface";
import { PokemonCard } from "@/components/pokemon/pokemon-card";
import { HeroShowcase } from "@/features/home/hero-showcase";
import { HeroSearch } from "@/features/home/hero-search";

export default async function HomePage() {
  const [index, featured] = await Promise.all([
    getPokedexIndex(),
    getFeaturedPokemon([HERO_POKEMON_ID, ...FEATURED_POKEMON_IDS.filter((id) => id !== HERO_POKEMON_ID)]),
  ]);
  const hero = featured.find((p) => p.id === HERO_POKEMON_ID);
  const companions = HERO_COMPANION_IDS.flatMap((id) => featured.filter((p) => p.id === id));
  const typeCounts = new Map(POKEMON_TYPES.map((t) => [t, index.filter((p) => p.types.includes(t)).length]));

  return (
    <>
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <PageContainer className="grid items-center gap-12 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-20">
          <RevealGroup>
            <p data-reveal className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              {index.length.toLocaleString("en")} Pokémon · live PokéAPI data
            </p>
            <AnimatedText
              as="h1"
              id="hero-title"
              trigger="mount"
              className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-text sm:text-6xl"
              text={[
                "The research terminal for ",
                { text: "every Pokémon", className: "bg-gradient-to-r from-accent to-accent-2 bg-clip-text pb-1 text-transparent" },
              ]}
            />
            <AnimatedText
              as="p"
              split="words"
              trigger="mount"
              delay={350}
              className="mt-5 max-w-xl text-lg text-muted"
              text="Search the National Pokédex, compare base stats, trace evolution chains and keep a collection of favorites."
            />
            <div data-reveal className="mt-8">
              <HeroSearch />
            </div>
            <div data-reveal className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/pokemon" size="lg">
                Open the Pokédex
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/favorites" variant="secondary" size="lg">
                <Heart className="size-4" aria-hidden="true" />
                Favorites
              </ButtonLink>
            </div>
          </RevealGroup>
          {/* The headline and artwork stay visible from first paint so they never delay LCP. */}
          {hero && <HeroShowcase pokemon={hero} companions={companions} />}
        </PageContainer>
      </section>

      <PageContainer className="space-y-20">
        <section aria-labelledby="featured-title">
          <SectionHeading
            id="featured-title"
            eyebrow="Featured"
            title="Fan favorites"
            description="A few well-known faces to start with."
            action={
              <Link href="/pokemon" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                View all <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          />
          {featured.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
              {featured.map((pokemon) => (
                <li key={pokemon.id}>
                  <PokemonCard pokemon={pokemon} artwork={pokemon.artwork} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Featured Pokémon are temporarily unavailable.</p>
          )}
        </section>

        <section aria-labelledby="types-title">
          <SectionHeading
            id="types-title"
            eyebrow="Explore"
            title="Browse by type"
            description="Jump into the Pokédex filtered to a single type."
          />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {POKEMON_TYPES.map((type) => (
              <li key={type}>
                <Link
                  href={`/pokemon?type=${type}`}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3.5 transition-[border-color,background-color] duration-200 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  style={{ borderLeftColor: TYPE_PALETTE[type].color, borderLeftWidth: 3 }}
                >
                  <span className="sr-only">{titleCase(type)} type, </span>
                  <TypeBadge type={type} />
                  <span className="font-mono text-xs tabular-nums text-subtle">
                    {typeCounts.get(type) ?? 0}
                    <span className="sr-only"> Pokémon</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tools-title" className="grid gap-4 md:grid-cols-3">
          <h2 id="tools-title" className="sr-only">
            What you can do
          </h2>
          <Surface className="p-6">
            <Layers className="mb-4 size-6 text-accent" aria-hidden="true" />
            <h3 className="font-display text-lg font-semibold text-text">Complete profiles</h3>
            <p className="mt-2 text-sm text-muted">Base stats, abilities, moves, sprites and Pokédex entries, straight from PokéAPI.</p>
          </Surface>
          <Surface className="p-6">
            <Heart className="mb-4 size-6 text-favorite" aria-hidden="true" />
            <h3 className="font-display text-lg font-semibold text-text">Your favorites</h3>
            <p className="mt-2 text-sm text-muted">Save Pokémon with one tap. Favorites stay in this browser across visits.</p>
          </Surface>
          <Surface className="p-6">
            <Box className="mb-4 size-6 text-accent-2" aria-hidden="true" />
            <h3 className="font-display text-lg font-semibold text-text">3D showcase</h3>
            <p className="mt-2 text-sm text-muted">
              An interactive WebGL viewer, demonstrated with a clearly labelled placeholder model on{" "}
              <Link href={`/pokemon/${SHOWCASE_POKEMON_SLUG}#showcase`} className="text-accent underline-offset-4 hover:underline">
                Eevee’s page
              </Link>
              .
            </p>
          </Surface>
        </section>
      </PageContainer>
    </>
  );
}
