"use client";

import { useEffect, useRef } from "react";
import { waveText, type Cleanup } from "@/lib/animations";

const WORDS: { text: string; className?: string }[] = [{ text: "Pokémon" }, { text: "Nexus", className: "text-accent" }];

/** "Pokémon Nexus" wordmark; its letters ripple when the logo link is hovered or focused. */
export function LogoWordmark() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current;
    const link = root?.closest("a");
    if (!root || !link) return;
    const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-letter]"));
    let cleanup: Cleanup | null = null;
    const play = () => {
      cleanup?.();
      cleanup = waveText(letters);
    };
    link.addEventListener("pointerenter", play);
    link.addEventListener("focus", play);
    return () => {
      link.removeEventListener("pointerenter", play);
      link.removeEventListener("focus", play);
      cleanup?.();
    };
  }, []);

  return (
    <span ref={ref} className="font-display text-lg font-semibold tracking-tight text-text">
      <span className="sr-only">Pokémon Nexus</span>
      <span aria-hidden="true">
        {WORDS.map((word, wi) => (
          <span key={word.text} className={word.className}>
            {wi > 0 && " "}
            {Array.from(word.text).map((char, i) => (
              <span key={i} data-letter className="inline-block">
                {char}
              </span>
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}
