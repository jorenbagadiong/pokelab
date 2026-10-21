"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PokemonImage } from "@/components/pokemon/pokemon-image";
import { cn } from "@/lib/utils/cn";

interface ArtworkViewerProps {
  name: string;
  artwork: string | null;
  shinyArtwork: string | null;
  color: string;
}

export function ArtworkViewer({ name, artwork, shinyArtwork, color }: ArtworkViewerProps) {
  const [shiny, setShiny] = useState(false);
  const showShiny = shiny && shinyArtwork !== null;

  return (
    <div className="relative">
      <div
        className="relative mx-auto aspect-square w-full max-w-md"
        style={{ background: `radial-gradient(closest-side, ${color}40, transparent 75%)` }}
      >
        <PokemonImage
          key={showShiny ? "shiny" : "default"}
          src={showShiny ? shinyArtwork : artwork}
          alt={showShiny ? `${name} (shiny)` : name}
          sizes="(min-width: 1024px) 28rem, 90vw"
          preload
          className="drop-shadow-[0_24px_40px_rgb(0_0_0/0.35)]"
        />
      </div>
      {shinyArtwork && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            aria-pressed={shiny}
            onClick={() => setShiny((v) => !v)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-200",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              shiny ? "border-accent bg-accent-soft text-text" : "border-border bg-surface text-muted hover:text-text",
            )}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {shiny ? "Showing shiny" : "Show shiny"}
          </button>
        </div>
      )}
    </div>
  );
}
