"use client";

import { useEffect, useRef } from "react";
import { Heart } from "lucide-react";
import { pop, type Cleanup } from "@/lib/animations";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils/cn";

interface FavoriteButtonProps {
  id: number;
  name: string;
  variant?: "icon" | "pill";
  className?: string;
}

export function FavoriteButton({ id, name, variant = "icon", className }: FavoriteButtonProps) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(id);
  const iconRef = useRef<SVGSVGElement>(null);
  const cleanupRef = useRef<Cleanup | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const onClick = () => {
    toggle(id);
    cleanupRef.current?.();
    cleanupRef.current = pop(iconRef.current);
  };

  const label = active ? `Remove ${name} from favorites` : `Add ${name} to favorites`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border transition-[background-color,border-color,color] duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        variant === "icon" ? "size-10" : "h-11 px-5 text-sm font-medium",
        active
          ? "border-favorite/40 bg-favorite/15 text-favorite hover:bg-favorite/25"
          : "border-border bg-bg-elevated/80 text-muted backdrop-blur hover:border-border-strong hover:text-text",
        className,
      )}
    >
      <Heart ref={iconRef} className={cn("size-[18px]", active && "fill-current")} aria-hidden="true" />
      {variant === "pill" && <span>{active ? "Saved to favorites" : "Add to favorites"}</span>}
    </button>
  );
}
