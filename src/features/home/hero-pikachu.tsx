"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Loader2, Zap } from "lucide-react";
import { typeColor } from "@/constants/types";
import { useIsClient } from "@/hooks/use-is-client";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { isHardwareAcceleratedWebGL } from "@/lib/webgl";
import { cn } from "@/lib/utils/cn";
import { formatDexNumber } from "@/lib/utils/format";
import { PokemonImage } from "@/components/pokemon/pokemon-image";

const PikachuScene = dynamic(() => import("@/components/three/pikachu-scene"), { ssr: false });

const noopSubscribe = () => () => {};

interface HeroPikachuProps {
  pokemon: { id: number; slug: string; name: string; types: string[]; artwork: string | null };
}

/**
 * Hero visual: a fan-made 3D Pikachu built in code. A loading state shows until
 * the first frame renders. The official 2D artwork appears only as the fallback
 * for devices without hardware-accelerated WebGL, and is never rendered before
 * that check, so capable devices only ever see the 3D model.
 */
export function HeroPikachu({ pokemon }: HeroPikachuProps) {
  const isClient = useIsClient();
  const supported = useSyncExternalStore(noopSubscribe, isHardwareAcceleratedWebGL, () => false);
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [hopSignal, setHopSignal] = useState(0);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
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

  const hop = () => setHopSignal((n) => n + 1);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      hop();
    }
  };

  const show3D = supported && ready;
  const interactive = supported && !reducedMotion;

  return (
    <div className="hero-art-enter relative mx-auto aspect-square w-full max-w-[26rem]">
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
          <span>Loading 3D {pokemon.name}…</span>
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
              ? `Fan-made 3D ${pokemon.name} built in code. Press to make it jump.`
              : `Fan-made 3D ${pokemon.name} built in code.`
          }
          onClick={interactive ? hop : undefined}
          onKeyDown={interactive ? onKeyDown : undefined}
          className={cn(
            "absolute inset-0 rounded-full opacity-0 transition-opacity duration-700",
            "focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-focus",
            show3D && "opacity-100",
            interactive && "cursor-pointer",
          )}
        >
          <PikachuScene animate={!reducedMotion} active={inView && tabVisible} hopSignal={hopSignal} onReady={onReady} />
        </div>
      )}

      <div className="absolute bottom-[4%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <Link
          href={`/pokemon/${pokemon.slug}`}
          className="whitespace-nowrap rounded-full border border-border bg-bg-elevated/85 px-4 py-1.5 text-sm backdrop-blur transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span className="font-mono text-subtle">{formatDexNumber(pokemon.id)}</span>{" "}
          <span className="font-display font-semibold text-text">{pokemon.name}</span>
        </Link>
        {show3D && (
          <p className="flex items-center gap-1 whitespace-nowrap text-[0.6875rem] text-subtle">
            <Zap className="size-3 text-accent" aria-hidden="true" />
            Fan-made 3D model{interactive ? " · tap to jump" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
