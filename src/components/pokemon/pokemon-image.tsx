"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PokemonImageProps {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  /** Pixel-art sprites are served as-is and scaled without smoothing. */
  pixelated?: boolean;
  preload?: boolean;
}

/**
 * Pokémon artwork with a graceful fallback when the URL is missing or the
 * image fails to load. Must be placed inside a positioned, sized container.
 */
export function PokemonImage({ src, alt, sizes, className, pixelated = false, preload = false }: PokemonImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !src || failedSrc === src;

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} (image unavailable)`}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-subtle"
      >
        <ImageOff className="size-8" aria-hidden="true" />
        <span className="text-xs">Artwork unavailable</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      // Above-the-fold artwork loads eagerly with high priority (Next 16 recommends this over `preload`).
      loading={preload ? "eager" : "lazy"}
      fetchPriority={preload ? "high" : "auto"}
      unoptimized={pixelated}
      onError={() => setFailedSrc(src)}
      className={cn("object-contain", pixelated && "pixelated", className)}
    />
  );
}
