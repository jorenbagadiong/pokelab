"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Loader2, Zap } from "lucide-react";
import { typeColor } from "@/constants/types";
import { useIsClient } from "@/hooks/use-is-client";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { isHardwareAcceleratedWebGL } from "@/lib/webgl";
import { cn } from "@/lib/utils/cn";
import { formatDexNumber } from "@/lib/utils/format";
import { PokemonImage } from "@/components/pokemon/pokemon-image";

const HeroScene = dynamic(() => import("@/components/three/hero-scene"), { ssr: false });

const noopSubscribe = () => () => {};
const listFormat = new Intl.ListFormat("en", { style: "long", type: "conjunction" });
/** What each companion does when the scene is activated (by National Pokédex number). */
const COMPANION_ACTIONS: Record<number, string> = { 6: "Charizard breathe fire", 94: "Gengar throw a Shadow Ball" };
const BADGE_CLASS =
  // pointer-events-auto: the label layer itself ignores the pointer so the scene stays clickable around the labels.
  "pointer-events-auto inline-block whitespace-nowrap rounded-full border border-border bg-bg-elevated/85 px-2.5 py-1 text-xs backdrop-blur " +
  "transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:px-3.5 sm:py-1.5 sm:text-sm";

function BadgeContent({ entry }: { entry: HeroPokemon }) {
  return (
    <>
      {/* The number is hidden on small screens to keep labels compact; aria-label keeps it for screen readers. */}
      <span className="hidden font-mono text-subtle sm:inline">{formatDexNumber(entry.id)} </span>
      <span className="font-display font-semibold text-text">{entry.name}</span>
    </>
  );
}

interface HeroPokemon {
  id: number;
  slug: string;
  name: string;
  types: string[];
  artwork: string | null;
}

interface HeroShowcaseProps {
  /** Foreground Pokémon (Pikachu); its artwork is the fallback without 3D. */
  pokemon: HeroPokemon;
  /** Other Pokémon in the scene (Charizard, Gengar). */
  companions?: HeroPokemon[];
}

/**
 * Hero visual: fan-made 3D Pikachu, Charizard and Gengar built in code. A loading state
 * shows until the first frame renders. The official 2D artwork appears only as
 * the fallback for devices without hardware-accelerated WebGL, and is never
 * rendered before that check, so capable devices only ever see the 3D scene.
 */
export function HeroShowcase({ pokemon, companions = [] }: HeroShowcaseProps) {
  const isClient = useIsClient();
  const supported = useSyncExternalStore(noopSubscribe, isHardwareAcceleratedWebGL, () => false);
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [actionSignal, setActionSignal] = useState(0);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelLayerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const onReady = useCallback(() => setReady(true), []);

  // Stop rendering while the hero is offscreen or the tab is hidden.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(stage);
    const onVisibility = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const act = () => setActionSignal((n) => n + 1);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      act();
    }
  };

  const names = listFormat.format([pokemon.name, ...companions.map((c) => c.name)]);
  const actions = [`make ${pokemon.name} jump`, ...companions.map((c) => COMPANION_ACTIONS[c.id] ?? `animate ${c.name}`)];
  const show3D = supported && ready;
  const interactive = supported && !reducedMotion;
  const everyone = [...companions, pokemon];
  // Each name label is anchored in 3D under its own Pokémon.
  const labels = everyone.map((entry) => ({
    id: entry.id,
    href: `/pokemon/${entry.slug}`,
    ariaLabel: `${formatDexNumber(entry.id)} ${entry.name}`,
    content: <BadgeContent entry={entry} />,
  }));

  return (
    <div className="hero-art-enter relative mx-auto aspect-square w-full max-w-[30rem]">
      <div
        aria-hidden="true"
        className="absolute inset-[8%] rounded-full border border-border"
        style={{ background: `radial-gradient(closest-side, ${typeColor(pokemon.types[0])}2e, transparent 80%)` }}
      />
      <div aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-border opacity-60" />

      {/* Loading state until the 3D model has rendered (and during server rendering). */}
      {(!isClient || (supported && !ready)) && (
        <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-muted">
          <Loader2 className="size-7 animate-spin text-accent" aria-hidden="true" />
          <span>Loading 3D scene…</span>
        </div>
      )}

      {/* Fallback only when 3D is unavailable: the official artwork. */}
      {isClient && !supported && (
        <div className="absolute inset-0">
          <PokemonImage
            src={pokemon.artwork}
            alt={`${pokemon.name} official artwork`}
            sizes="(min-width: 1024px) 26rem, 80vw"
            preload
            className="p-6 drop-shadow-[0_30px_50px_rgb(0_0_0/0.35)]"
          />
        </div>
      )}

      {supported && (
        <div
          ref={stageRef}
          role={interactive ? "button" : "img"}
          tabIndex={interactive ? 0 : undefined}
          aria-label={
            interactive
              ? `Fan-made 3D ${names} built in code. Press to ${listFormat.format(actions)}.`
              : `Fan-made 3D ${names} built in code.`
          }
          onClick={interactive ? act : undefined}
          onKeyDown={interactive ? onKeyDown : undefined}
          className={cn(
            "absolute inset-0 rounded-full opacity-0 transition-opacity duration-700",
            "focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-focus",
            show3D && "opacity-100",
            interactive && "cursor-pointer",
          )}
        >
          <HeroScene
            animate={!reducedMotion}
            active={inView && tabVisible}
            actionSignal={actionSignal}
            onReady={onReady}
            labels={labels}
            labelLayer={labelLayerRef}
            labelClassName={BADGE_CLASS}
            onNavigate={router.push}
          />
        </div>
      )}

      {/* Labels are projected here from the 3D scene: a sibling of the clickable stage, so they open the Pokémon page. */}
      {supported && (
        <div
          ref={labelLayerRef}
          className={cn("pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700", show3D && "opacity-100")}
        />
      )}

      <div className="absolute inset-x-2 bottom-[3%] flex flex-col items-center gap-1.5">
        {/* Without the 3D scene (loading or unsupported), show the names as a simple row. */}
        {!show3D && (
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
            {everyone.map((entry) => (
              <Link key={entry.id} href={`/pokemon/${entry.slug}`} aria-label={`${formatDexNumber(entry.id)} ${entry.name}`} className={BADGE_CLASS}>
                <BadgeContent entry={entry} />
              </Link>
            ))}
          </div>
        )}
        {show3D && (
          <p className="flex items-center gap-1 whitespace-nowrap text-[0.6875rem] text-subtle">
            <Zap className="size-3 text-accent" aria-hidden="true" />
            Fan-made 3D models{interactive ? " · tap for action" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
