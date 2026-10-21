"use client";

import { useLayoutEffect, useRef, type DependencyList, type RefObject } from "react";
import { reveal, type RevealOptions } from "@/lib/animations";

/**
 * Reveals the children of `ref` matching `selector` whenever `deps` change.
 * Runs in a layout effect so client-rendered items are hidden before paint.
 */
export function useReveal<T extends HTMLElement>(
  selector: string,
  deps: DependencyList,
  options?: RevealOptions,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const optionsRef = useRef(options);

  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    return reveal(targets, optionsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers control re-runs via `deps`
  }, [selector, ...deps]);

  return ref;
}
