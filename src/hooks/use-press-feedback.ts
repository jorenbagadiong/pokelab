"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { press, type Cleanup } from "@/lib/animations";

/** Returns an `onPointerDown` handler that plays a subtle press animation, cleaned up on unmount. */
export function usePressFeedback() {
  const cleanup = useRef<Cleanup | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  return useCallback((event: PointerEvent<HTMLElement>) => {
    cleanup.current?.();
    cleanup.current = press(event.currentTarget);
  }, []);
}
