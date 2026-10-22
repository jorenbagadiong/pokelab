"use client";

import { useEffect, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Html, Lightformer } from "@react-three/drei";
import { Charizard } from "./charizard-model";
import { Gengar } from "./gengar-model";
import { Pikachu } from "./pikachu-model";

/** Calls `onReady` once the first frame has rendered. */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => onReady?.());
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

type Vec3 = [number, number, number];

/** Where each Pokémon stands (by National Pokédex number) and where its name label sits. */
/** `labelX` nudges a label sideways (world units) when it would overlap a neighbour. */
const SLOTS: Record<number, { position: Vec3; rotation: number; scale: number; labelY: number; labelX?: number }> = {
  // Charizard is far larger than Pikachu in the games; keep that sense of scale.
  // Charizard hovers behind the others, so its label sits above its head where there is free space.
  6: { position: [0.1, 0, -2.2], rotation: 0.25, scale: 1.05, labelY: 4.75 },
  94: { position: [-1.45, 0, 0.75], rotation: 0.4, scale: 0.82, labelY: -0.12 },
  25: { position: [1.35, 0, 1.15], rotation: -0.3, scale: 0.6, labelY: -0.12 },
};

export interface SceneLabel {
  id: number;
  href: string;
  ariaLabel: string;
  content: ReactNode;
}

export interface HeroSceneProps {
  /** False for reduced motion: a static pose rendered on demand. */
  animate: boolean;
  /** False while offscreen or the tab is hidden, to stop rendering. */
  active: boolean;
  /** Increments to make Pikachu hop, Charizard breathe fire and Gengar throw a Shadow Ball. */
  actionSignal: number;
  onReady?: () => void;
  /** Name labels anchored under each Pokémon, rendered into `labelLayer` (outside the clickable canvas). */
  labels?: SceneLabel[];
  labelLayer?: RefObject<HTMLElement | null>;
  labelClassName?: string;
  onNavigate?: (href: string) => void;
}

/** Hero scene: Charizard hovering behind Gengar and Pikachu, lit partly by its tail flame. */
export default function HeroScene({
  animate,
  active,
  actionSignal,
  onReady,
  labels = [],
  labelLayer,
  labelClassName,
  onNavigate,
}: HeroSceneProps) {
  const models: Record<number, ReactNode> = {
    6: <Charizard animate={animate} breathSignal={actionSignal} />,
    94: <Gengar animate={animate} actionSignal={actionSignal} />,
    25: <Pikachu animate={animate} hopSignal={actionSignal} />,
  };

  // Plain clicks navigate client-side; modified clicks keep normal link behaviour.
  const onLabelClick = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onNavigate(href);
  };

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      frameloop={animate && active ? "always" : "demand"}
      camera={{ position: [0, 2.4, 9.6], fov: 42 }}
      onCreated={({ camera }) => camera.lookAt(0, 1.45, 0)}
      gl={{ antialias: true, alpha: true }}
    >
      <hemisphereLight args={["#fff6e0", "#2a2018", 0.5]} />
      <directionalLight
        position={[3, 6, 5]}
        intensity={2.3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={4}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      {/* Cool rim light from behind separates the silhouettes from the background. */}
      <directionalLight position={[-2.5, 4, -6]} intensity={1.6} color="#a8d8ff" />
      {/* Studio reflections from local light panels (no HDR download). */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 6]} scale={[7, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-6, 2, 1]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#67e8f9" position={[4, 3, -5]} rotation-y={-Math.PI * 0.8} scale={[5, 2, 1]} />
        <Lightformer form="circle" intensity={0.9} color="#ffb070" position={[-2, 1, -4]} scale={3} />
      </Environment>

      {Object.entries(SLOTS).map(([id, slot]) => (
        <group key={id} position={slot.position} rotation={[0, slot.rotation, 0]} scale={slot.scale}>
          {models[Number(id)]}
        </group>
      ))}

      {labelLayer &&
        labels.map((label) => {
          const slot = SLOTS[label.id];
          if (!slot) return null;
          return (
            <Html
              key={label.id}
              position={[slot.position[0] + (slot.labelX ?? 0), slot.labelY, slot.position[2]]}
              portal={labelLayer as RefObject<HTMLElement>}
              center
              zIndexRange={[10, 0]}
              pointerEvents="auto"
            >
              <a href={label.href} aria-label={label.ariaLabel} onClick={onLabelClick(label.href)} className={labelClassName}>
                {label.content}
              </a>
            </Html>
          );
        })}

      <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={9} blur={2.4} far={3.2} resolution={512} frames={animate ? Infinity : 1} />
      <ReadySignal onReady={onReady} />
    </Canvas>
  );
}
