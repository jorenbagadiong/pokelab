import type { ReactNode } from "react";
import { isPokemonType, TYPE_PALETTE } from "@/constants/types";
import { cn } from "@/lib/utils/cn";
import { titleCase } from "@/lib/utils/format";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TypeBadge({ type, size = "sm" }: { type: string; size?: "sm" | "md" }) {
  const palette = isPokemonType(type) ? TYPE_PALETTE[type] : null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold uppercase tracking-wide",
        size === "sm" ? "px-2.5 py-0.5 text-[0.6875rem]" : "px-3.5 py-1 text-xs",
        !palette && "border border-border bg-surface text-muted",
      )}
      style={palette ? { backgroundColor: palette.color, color: palette.text } : undefined}
    >
      {titleCase(type)}
    </span>
  );
}
