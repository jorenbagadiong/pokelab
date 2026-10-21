"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Box3, Mesh, Vector3, type Material, type Object3D, type Texture } from "three";
import { Pause, Play, RotateCcw } from "lucide-react";
import { IconButton } from "@/components/ui/button";

/** Longest side of the normalised model, in scene units. */
const TARGET_SIZE = 3;
const CAMERA_POSITION: [number, number, number] = [2.6, 1.7, 3.3];
const CAMERA_TARGET: [number, number, number] = [0, 0.8, 0];

export interface ModelViewerProps {
  url: string;
  label: string;
  idleAnimation?: string;
  reducedMotion: boolean;
  onReady?: () => void;
}

function disposeObject(root: Object3D) {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.geometry?.dispose();
    const materials: Material[] = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value && typeof value === "object" && (value as Texture).isTexture) (value as Texture).dispose();
      }
      material.dispose();
    }
  });
}

function Model({
  url,
  idleAnimation,
  animate,
  onReady,
}: {
  url: string;
  idleAnimation?: string;
  animate: boolean;
  onReady?: () => void;
}) {
  // Draco is disabled: the bundled model is uncompressed and this avoids fetching a decoder from a CDN.
  const { scene, animations } = useGLTF(url, false);
  const group = useRef<Object3D>(null);
  const { actions } = useAnimations(animations, group);

  // Normalise scale and place the model on the ground plane, centred.
  const transform = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = TARGET_SIZE / Math.max(size.x, size.y, size.z, 1e-6);
    return {
      scale,
      position: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [number, number, number],
    };
  }, [scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof Mesh) child.castShadow = true;
    });
    onReady?.();
  }, [scene, onReady]);

  useEffect(() => {
    const action = idleAnimation ? actions[idleAnimation] : null;
    if (!action) return;
    if (animate) action.reset().fadeIn(0.3).play();
    else action.stop();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, idleAnimation, animate]);

  // This tree lives in R3F's own root, which only unmounts when the viewer is
  // finally removed, so this releases GPU-side resources and the loader cache.
  useEffect(
    () => () => {
      disposeObject(scene);
      useGLTF.clear(url);
    },
    [scene, url],
  );

  return (
    <group ref={group} scale={transform.scale} position={transform.position}>
      <primitive object={scene} />
    </group>
  );
}

export default function ModelViewer({ url, label, idleAnimation, reducedMotion, onReady }: ModelViewerProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [autoRotate, setAutoRotate] = useState(!reducedMotion);
  const rotating = autoRotate && !reducedMotion;

  // Follow changes to the reduced-motion preference.
  const [prevReduced, setPrevReduced] = useState(reducedMotion);
  if (prevReduced !== reducedMotion) {
    setPrevReduced(reducedMotion);
    setAutoRotate(!reducedMotion);
  }

  // OrbitControls snapshots its state before the `target` prop is applied, so
  // restore the initial view explicitly rather than calling `controls.reset()`.
  const resetCamera = () => {
    const current = controls.current;
    if (!current) return;
    current.object.position.set(...CAMERA_POSITION);
    current.target.set(...CAMERA_TARGET);
    current.update();
  };

  return (
    <div className="relative size-full">
      <Canvas
        // PCF shadows; three.js removed PCFSoftShadowMap, which R3F requests for `shadows={true}`.
        shadows="percentage"
        dpr={[1, 1.75]}
        frameloop={reducedMotion ? "demand" : "always"}
        camera={{ position: CAMERA_POSITION, fov: 38, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: "default" }}
        aria-label={label}
        role="img"
        className="touch-none"
      >
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[4, 7, 3]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {/* Local studio environment built from light panels: no HDR files are fetched. */}
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2.4} position={[0, 5, -6]} scale={[12, 5, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#67e8f9" position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#a78bfa" position={[6, 2, 2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
        </Environment>
        <Suspense fallback={null}>
          <Model url={url} idleAnimation={idleAnimation} animate={!reducedMotion} onReady={onReady} />
        </Suspense>
        <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={9} blur={2.6} far={3.5} resolution={512} frames={reducedMotion ? 1 : Infinity} />
        <OrbitControls
          ref={controls}
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={2.2}
          maxDistance={7}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2 - 0.08}
          target={CAMERA_TARGET}
          autoRotate={rotating}
          autoRotateSpeed={0.9}
        />
      </Canvas>

      <div className="absolute bottom-3 right-3 flex gap-2">
        {!reducedMotion && (
          <IconButton
            size="sm"
            label={autoRotate ? "Pause auto-rotation" : "Start auto-rotation"}
            aria-pressed={autoRotate}
            onClick={() => setAutoRotate((v) => !v)}
            className="bg-bg-elevated/80 backdrop-blur"
          >
            {autoRotate ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          </IconButton>
        )}
        <IconButton
          size="sm"
          label="Reset camera"
          onClick={resetCamera}
          className="bg-bg-elevated/80 backdrop-blur"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}
