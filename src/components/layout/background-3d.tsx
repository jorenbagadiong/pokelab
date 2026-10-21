"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { themeStore } from "@/lib/theme";
import { isHardwareAcceleratedWebGL } from "@/lib/webgl";

// three.js stays out of the initial bundle; this chunk is requested only once the browser is idle.
const NexusBackground = dynamic(() => import("@/components/three/nexus-background"), { ssr: false });

const noopSubscribe = () => () => {};
const START_DELAY_MS = 1500;

/** Skip the decorative scene where it would cost more than it adds. */
export function shouldRenderBackground(): boolean {
  // Software-rendered WebGL would compete with the page for the main thread.
  if (typeof window === "undefined" || !isHardwareAcceleratedWebGL()) return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return false;
  return true;
}

/**
 * Fixed, decorative 3D backdrop behind all pages. The CSS ambient gradient on
 * <body> remains the fallback when this does not render.
 */
export function Background3D() {
  const supported = useSyncExternalStore(noopSubscribe, shouldRenderBackground, () => false);
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.getServerSnapshot);
  const reducedMotion = useReducedMotion();
  const [idle, setIdle] = useState(false);

  // Start after the entrance animations have played, then wait for an idle moment.
  useEffect(() => {
    if (!supported) return;
    let idleHandle: number | undefined;
    const delay = setTimeout(() => {
      if ("requestIdleCallback" in window) idleHandle = window.requestIdleCallback(() => setIdle(true), { timeout: 2000 });
      else setIdle(true);
    }, START_DELAY_MS);
    return () => {
      clearTimeout(delay);
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
    };
  }, [supported]);

  if (!supported || !idle) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="background-3d"
      className="pointer-events-none fixed inset-0 z-0 animate-[nexus-fade-in_1.2s_ease-out_both]"
    >
      <NexusBackground theme={theme} animate={!reducedMotion} />
      {/* Soft vignette keeps foreground text readable over the scene. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--bg)_95%)]" />
    </div>
  );
}
