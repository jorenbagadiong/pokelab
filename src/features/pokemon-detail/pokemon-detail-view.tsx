import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import type { PokemonDetail, PokemonSummary } from "@/types/pokemon";
import { typeColor } from "@/constants/types";
import { SHOWCASE_MODELS } from "@/constants/showcase";
import {
  formatDexNumber,
  formatGeneration,
  formatKilograms,
  formatMetres,
  formatVersionName,
  titleCase,
} from "@/lib/utils/format";
import { PageContainer } from "@/components/layout/page-container";
import { Badge, TypeBadge } from "@/components/ui/badge";
import { AnimatedText } from "@/components/ui/animated-text";
import { RevealGroup } from "@/components/ui/reveal-group";
import { Surface } from "@/components/ui/surface";
import { FavoriteButton } from "@/components/pokemon/favorite-button";
import { AbilitiesList } from "./abilities-list";
import { ArtworkViewer } from "./artwork-viewer";
import { EvolutionChain } from "./evolution-chain";
import { MovesSkeleton, MovesTable } from "./moves-table";
import { PrevNextNav } from "./prev-next-nav";
import { Showcase3D } from "./showcase-3d";
import { SpriteGallery } from "./sprite-gallery";
import { StatBars } from "./stat-bars";

const SECTIONS = [
  { id: "stats", label: "Stats" },
  { id: "evolution", label: "Evolution" },
  { id: "moves", label: "Moves" },
  { id: "sprites", label: "Sprites" },
  { id: "games", label: "Games" },
  { id: "showcase", label: "3D" },
] as const;

function Section({ id, title, children, className }: { id: string; title: string; children: ReactNode; className?: string }) {
  return (
    <Surface as="section" aria-labelledby={`${id}-title`} id={id} className={`scroll-mt-36 p-5 sm:p-6 ${className ?? ""}`}>
      <AnimatedText as="h2" id={`${id}-title`} text={title} className="mb-5 font-display text-xl font-semibold text-text" />
      {children}
    </Surface>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="mt-0.5 font-medium text-text">{value ?? <span className="text-subtle">Unknown</span>}</dd>
    </div>
  );
}

interface Props {
  detail: PokemonDetail;
  prev: PokemonSummary | null;
  next: PokemonSummary | null;
}

export function PokemonDetailView({ detail, prev, next }: Props) {
  const color = typeColor(detail.types[0]);
  const model = SHOWCASE_MODELS[detail.id] ?? null;

  return (
    <article className="relative isolate">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] opacity-70"
        style={{ background: `radial-gradient(50rem 26rem at 30% 0%, ${color}26, transparent 70%)` }}
        aria-hidden="true"
      />
      <PageContainer className="pt-8 sm:pt-12">
        <Link
          href="/pokemon"
          className="mb-8 inline-flex items-center gap-1 rounded-full text-sm text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back to Pokédex
        </Link>

        <RevealGroup className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
          <div className="hero-art-enter">
            <ArtworkViewer name={detail.name} artwork={detail.artwork} shinyArtwork={detail.shinyArtwork} color={color} />
          </div>

          <div>
            <p data-reveal className="font-mono text-sm tabular-nums text-subtle">
              {formatDexNumber(detail.id)}
            </p>
            <AnimatedText
              as="h1"
              trigger="mount"
              delay={120}
              text={detail.name}
              className="mt-1 font-display text-4xl font-bold tracking-tight text-text sm:text-5xl"
            />
            {detail.genus && (
              <p data-reveal className="mt-1 text-muted">
                {detail.genus}
              </p>
            )}
            <div data-reveal className="mt-4 flex flex-wrap items-center gap-2">
              {detail.types.map((type) => (
                <TypeBadge key={type} type={type} size="md" />
              ))}
              {detail.isLegendary && <Badge className="border-accent-2/40 text-accent-2">Legendary</Badge>}
              {detail.isMythical && <Badge className="border-accent-2/40 text-accent-2">Mythical</Badge>}
              {detail.isBaby && <Badge>Baby</Badge>}
            </div>

            {detail.flavorText ? (
              <blockquote data-reveal className="mt-6 border-l-2 pl-4 text-text/90" style={{ borderColor: color }}>
                <p className="leading-relaxed">{detail.flavorText}</p>
                {detail.flavorVersion && (
                  <footer className="mt-2 text-xs text-subtle">Pokédex entry · Pokémon {formatVersionName(detail.flavorVersion)}</footer>
                )}
              </blockquote>
            ) : (
              <p data-reveal className="mt-6 text-sm text-subtle">No Pokédex entry is available.</p>
            )}

            <dl data-reveal className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Fact label="Height" value={formatMetres(detail.heightM)} />
              <Fact label="Weight" value={formatKilograms(detail.weightKg)} />
              <Fact label="Base experience" value={detail.baseExperience} />
              <Fact label="Capture rate" value={detail.captureRate} />
              <Fact label="Introduced" value={detail.generation ? formatGeneration(detail.generation) : null} />
              <Fact label="Habitat" value={detail.habitat ? titleCase(detail.habitat) : null} />
            </dl>

            <div data-reveal className="mt-6">
              <FavoriteButton id={detail.id} name={detail.name} variant="pill" />
            </div>
          </div>
        </RevealGroup>

        <nav
          aria-label="Sections"
          className="sticky top-[var(--header-height)] z-20 -mx-4 mt-12 overflow-x-auto border-y border-border bg-bg/85 px-4 py-2 backdrop-blur-xl sm:mx-0 sm:rounded-full sm:border"
        >
          <ul className="flex gap-1">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Section id="stats" title="Base stats">
            <StatBars stats={detail.stats} total={detail.statTotal} color={color} />
          </Section>
          <Section id="abilities" title="Abilities">
            <AbilitiesList abilities={detail.abilities} />
          </Section>
          <Section id="evolution" title="Evolution" className="lg:col-span-2">
            <EvolutionChain chain={detail.evolution} currentId={detail.id} />
          </Section>
          <Section id="moves" title="Moves" className="lg:col-span-2">
            <Suspense fallback={<MovesSkeleton />}>
              <MovesTable refs={detail.moveRefs} versionGroup={detail.versionGroup} totalMoves={detail.totalMoves} />
            </Suspense>
          </Section>
          <Section id="sprites" title="Artwork & sprites" className="lg:col-span-2">
            <SpriteGallery sprites={detail.sprites} name={detail.name} />
          </Section>
          <Section id="games" title="Game appearances" className="lg:col-span-2">
            {detail.games.length > 0 ? (
              <>
                <p className="mb-4 text-sm text-muted">
                  Main-series games with a Pokédex index for {detail.name}, according to PokéAPI.
                </p>
                <ul className="flex flex-wrap gap-2">
                  {detail.games.map((game) => (
                    <li key={game}>
                      <Badge>{formatVersionName(game)}</Badge>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-muted">PokéAPI does not list game index data for this Pokémon.</p>
            )}
          </Section>
          <Section id="showcase" title="3D showcase" className="lg:col-span-2">
            <Showcase3D pokemonName={detail.name} model={model} artwork={detail.artwork} color={color} />
          </Section>
        </div>

        <div className="mt-10">
          <PrevNextNav prev={prev} next={next} />
        </div>
      </PageContainer>
    </article>
  );
}
