"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState, useSyncExternalStore, type ReactNode } from "react";
import { Box, Info, Loader2, MonitorOff, RotateCcw } from "lucide-react";
import type { ShowcaseModel } from "@/constants/showcase";
import { SHOWCASE_POKEMON_SLUG } from "@/constants/showcase";
import { useIsClient } from "@/hooks/use-is-client";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { threePreferenceStore } from "@/lib/three-preference";
import { isWebGLAvailable } from "@/lib/webgl";
import { Button } from "@/components/ui/button";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { ViewerErrorBoundary } from "@/components/three/viewer-error-boundary";

// three.js and the viewer are only downloaded when the viewer is actually shown.
const ModelViewer = dynamic(() => import("@/components/three/model-viewer"), {
  ssr: false,
  loading: () => <ViewerStatus icon={<Loader2 className="size-6 animate-spin" />} text="Loading 3D engine…" />,
});

const noopSubscribe = () => () => {};

function ViewerStatus({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-muted">
      <span aria-hidden="true">{icon}</span>
      {text}
    </div>
  );
}

interface Showcase3DProps {
  pokemonName: string;
  model: ShowcaseModel | null;
  artwork: string | null;
  color: string;
}

function ArtworkFallback({ pokemonName, artwork, children }: { pokemonName: string; artwork: string | null; children: ReactNode }) {
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[12rem_1fr]">
      <div className="relative mx-auto aspect-square w-40 sm:w-48">
        <PokemonImage src={artwork} alt={`${pokemonName} official artwork (2D)`} sizes="12rem" />
      </div>
      <div className="text-sm text-muted">{children}</div>
    </div>
  );
}

export function Showcase3D({ pokemonName, model, artwork, color }: Showcase3DProps) {
  const isClient = useIsClient();
  const reducedMotion = useReducedMotion();
  const preference = useSyncExternalStore(
    threePreferenceStore.subscribe,
    threePreferenceStore.get,
    threePreferenceStore.getServerSnapshot,
  );
  const webgl = useSyncExternalStore(noopSubscribe, isWebGLAvailable, () => false);
  const [requested, setRequested] = useState(false);
  const [ready, setReady] = useState(false);
  // Bumped on retry so the loader cache (keyed by URL) cannot return a cached failure.
  const [attempt, setAttempt] = useState(0);
  const onReady = useCallback(() => setReady(true), []);

  if (!model) {
    return (
      <ArtworkFallback pokemonName={pokemonName} artwork={artwork}>
        <p>
          A 3D model is not available for {pokemonName}. PokéAPI provides data and 2D sprites only, and no licensed 3D model
          has been added for this Pokémon.
        </p>
        <p className="mt-2">
          See the{" "}
          <Link href={`/pokemon/${SHOWCASE_POKEMON_SLUG}`} className="text-accent underline-offset-4 hover:underline">
            3D showcase on Eevee’s page
          </Link>
          .
        </p>
      </ArtworkFallback>
    );
  }

  const label = model.isPlaceholder
    ? `Interactive 3D placeholder model (${model.modelName}). This is not a model of ${pokemonName}.`
    : `Interactive 3D model of ${pokemonName}`;

  let stage: ReactNode;
  if (!isClient) {
    stage = <ViewerStatus icon={<Box className="size-6" />} text="Preparing 3D viewer…" />;
  } else if (!webgl) {
    stage = (
      <ViewerStatus
        icon={<MonitorOff className="size-6" />}
        text="3D isn’t available: WebGL is disabled or unsupported in this browser."
      />
    );
  } else if (preference !== "auto" && !requested) {
    stage = (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="relative size-32 opacity-80">
          <PokemonImage src={artwork} alt="" sizes="8rem" />
        </div>
        <p className="max-w-xs text-sm text-muted">Downloads the 3D engine (about 300 KB compressed) and a 160 KB model.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => setRequested(true)}>
            <Box className="size-4" aria-hidden="true" />
            Load 3D viewer
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              threePreferenceStore.set("auto");
              setRequested(true);
            }}
          >
            Always load 3D
          </Button>
        </div>
      </div>
    );
  } else {
    stage = (
      <ViewerErrorBoundary
        fallback={(_, reset) => (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted">The 3D model failed to load.</p>
            <Button
              variant="secondary"
              onClick={() => {
                setAttempt((n) => n + 1);
                setReady(false);
                reset();
              }}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Retry
            </Button>
          </div>
        )}
      >
        <ModelViewer
          key={attempt}
          url={attempt ? `${model.url}?retry=${attempt}` : model.url}
          label={label} idleAnimation={model.idleAnimation} reducedMotion={reducedMotion} onReady={onReady} />
        {!ready && <ViewerStatus icon={<Loader2 className="size-6 animate-spin" />} text="Loading model…" />}
      </ViewerErrorBoundary>
    );
  }

  return (
    <div>
      {model.isPlaceholder && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-accent-2/30 bg-accent-2-soft px-4 py-3 text-sm text-text">
          <Info className="mt-0.5 size-4 shrink-0 text-accent-2" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Placeholder model.</strong> No properly licensed {pokemonName} 3D model is
            available, so this viewer shows the openly licensed “{model.modelName}” sample model to demonstrate the 3D
            showcase. It is not {pokemonName}.
          </span>
        </p>
      )}
      <div
        className="relative h-[22rem] overflow-hidden rounded-xl border border-border sm:h-[28rem]"
        style={{ background: `radial-gradient(70% 60% at 50% 70%, ${color}30, transparent 70%), var(--bg-elevated)` }}
      >
        {stage}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-subtle">
        <p>
          Drag to orbit · pinch or scroll to zoom.{" "}
          <a href={model.sourceUrl} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-text hover:underline">
            {model.credit}
          </a>
        </p>
        {isClient && preference === "auto" && (
          <button
            type="button"
            className="rounded underline-offset-4 hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-focus"
            onClick={() => {
              threePreferenceStore.set("manual");
              setRequested(false);
              setReady(false);
            }}
          >
            Don’t load 3D automatically
          </button>
        )}
      </div>
    </div>
  );
}
