"use client";

import type { ReactNode } from "react";
import { useReveal } from "@/hooks/use-reveal";

/** Animates `[data-reveal]` descendants into view once on mount. Children may be server-rendered. */
export function RevealGroup({ children, className, step }: { children: ReactNode; className?: string; step?: number }) {
  const ref = useReveal<HTMLDivElement>("[data-reveal]", [], { step: step ?? 70, distance: 16 });
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
