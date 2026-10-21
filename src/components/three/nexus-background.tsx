"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, NormalBlending, type Blending, type Group } from "three";
import type { Theme } from "@/lib/theme";

/*
 * Decorative "research nexus" backdrop: a slowly drifting particle field, a
 * constellation of linked nodes and a few wireframe polyhedra. Purely visual
 * (aria-hidden, no pointer events); colours follow the active theme.
 */

const PALETTES: Record<Theme, { primary: string; secondary: string; points: number; lines: number; shapes: number; blending: Blending }> = {
  dark: { primary: "#22d3ee", secondary: "#a78bfa", points: 0.8, lines: 0.1, shapes: 0.12, blending: AdditiveBlending },
  light: { primary: "#0e7490", secondary: "#6d28d9", points: 0.45, lines: 0.08, shapes: 0.08, blending: NormalBlending },
};

/** Deterministic PRNG so the layout is identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildField(count: number, radius: number, seed: number) {
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Uniform points inside a flattened sphere shell.
    const u = rand() * 2 - 1;
    const theta = rand() * Math.PI * 2;
    const r = radius * (0.35 + 0.65 * Math.cbrt(rand()));
    const s = Math.sqrt(1 - u * u);
    positions.set([r * s * Math.cos(theta), r * u * 0.6, r * s * Math.sin(theta)], i * 3);
  }
  return positions;
}

function buildConstellation(nodes: number, radius: number, maxDistance: number, seed: number) {
  const points = buildField(nodes, radius, seed);
  const segments: number[] = [];
  for (let a = 0; a < nodes; a++) {
    let links = 0;
    for (let b = a + 1; b < nodes && links < 3; b++) {
      const dx = points[a * 3] - points[b * 3];
      const dy = points[a * 3 + 1] - points[b * 3 + 1];
      const dz = points[a * 3 + 2] - points[b * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < maxDistance * maxDistance) {
        segments.push(...points.subarray(a * 3, a * 3 + 3), ...points.subarray(b * 3, b * 3 + 3));
        links++;
      }
    }
  }
  return { nodes: points, segments: new Float32Array(segments) };
}

/** Soft round sprite so points render as glowing dots rather than squares. */
function createDotTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.8)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

interface SceneProps {
  theme: Theme;
  animate: boolean;
}

function Scene({ theme, animate }: SceneProps) {
  const palette = PALETTES[theme];
  const root = useRef<Group>(null);
  const shapes = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);

  const field = useMemo(() => buildField(900, 9, 7), []);
  const dot = useMemo(() => createDotTexture(), []);
  useEffect(() => () => dot.dispose(), [dot]);
  const constellation = useMemo(() => buildConstellation(70, 6, 2.1, 42), []);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      scroll.current = window.scrollY;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useFrame((_, delta) => {
    if (!root.current || !animate) return;
    const dt = Math.min(delta, 0.05); // avoid jumps after the tab was hidden
    const group = root.current;
    group.rotation.y += dt * 0.025;
    // Ease towards the pointer and scroll position for a gentle parallax.
    group.rotation.x += (pointer.current.y * 0.12 - group.rotation.x) * dt * 1.5;
    group.position.x += (pointer.current.x * -0.35 - group.position.x) * dt * 1.5;
    group.position.y += (scroll.current * 0.0012 - group.position.y) * dt * 2;
    if (shapes.current) {
      for (const [i, child] of shapes.current.children.entries()) {
        child.rotation.x += dt * (0.05 + i * 0.02);
        child.rotation.y += dt * (0.07 + i * 0.015);
      }
    }
  });

  return (
    <group ref={root} position-z={-2}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[field, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={palette.primary}
          size={0.06}
          map={dot}
          alphaTest={0.01}
          sizeAttenuation
          transparent
          opacity={palette.points}
          depthWrite={false}
          blending={palette.blending}
        />
      </points>

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[constellation.segments, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={palette.secondary} transparent opacity={palette.lines} depthWrite={false} blending={palette.blending} />
      </lineSegments>

      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[constellation.nodes, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={palette.secondary}
          size={0.16}
          map={dot}
          alphaTest={0.01}
          sizeAttenuation
          transparent
          opacity={Math.min(1, palette.points + 0.15)}
          depthWrite={false}
          blending={palette.blending}
        />
      </points>

      <group ref={shapes}>
        <mesh position={[6.5, 2.2, -4]}>
          <icosahedronGeometry args={[1.5, 1]} />
          <meshBasicMaterial color={palette.primary} wireframe transparent opacity={palette.shapes} depthWrite={false} />
        </mesh>
        <mesh position={[-7, -2.6, -3]}>
          <octahedronGeometry args={[1.1, 0]} />
          <meshBasicMaterial color={palette.secondary} wireframe transparent opacity={palette.shapes} depthWrite={false} />
        </mesh>
        <mesh position={[5.5, -3.2, -6]}>
          <torusGeometry args={[1.2, 0.02, 8, 64]} />
          <meshBasicMaterial color={palette.primary} transparent opacity={palette.shapes * 1.4} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

export interface NexusBackgroundProps {
  theme: Theme;
  /** False for reduced motion: a single static frame is rendered. */
  animate: boolean;
}

export default function NexusBackground({ theme, animate }: NexusBackgroundProps) {
  const [visible, setVisible] = useState(true);

  // Stop rendering entirely while the tab is hidden.
  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={animate && visible ? "always" : "demand"}
      camera={{ position: [0, 0, 8], fov: 55 }}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
    >
      <Scene theme={theme} animate={animate} />
    </Canvas>
  );
}
