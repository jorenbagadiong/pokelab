"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { createFurShellMaterials, createStrandMask } from "@/lib/three/procedural";
import {
  AdditiveBlending,
  BufferAttribute,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  ExtrudeGeometry,
  LatheGeometry,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  RepeatWrapping,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Group,
  type Mesh,
} from "three";

/*
 * A fan-made Pikachu modelled procedurally (no third-party model or texture).
 *
 * - Head and body are one lathed silhouette, so the figure reads as a single
 *   soft form; back stripes, ear tips and the tail base are vertex colours.
 * - Fur look: physically based material with sheen plus a generated fur
 *   normal map; glossy eyes; studio lighting from local light panels.
 * - Facial features are placed on the actual curved surface.
 *
 * Idle: bob, blink, ear twitch, tail wag, turns towards the pointer.
 * `hopSignal` increments to trigger a hop with an electric spark from the cheeks.
 */

const PALETTE = {
  fur: new Color("#f8d030"),
  stripe: new Color("#7a4a1c"),
  earTip: new Color("#161210"),
  tailBase: new Color("#8a5a2b"),
  cheek: "#e8473f",
  eye: "#120d0b",
  mouth: "#3b1f14",
  spark: "#fff27a",
};

/** Body silhouette as (radius, height) control points, bottom to top of the head. */
const BODY_PROFILE: [number, number][] = [
  [0.0, 0.0], [0.44, 0.04], [0.69, 0.24], [0.77, 0.52], [0.74, 0.84], [0.65, 1.12], [0.63, 1.3],
  [0.68, 1.56], [0.71, 1.82], [0.65, 2.06], [0.49, 2.26], [0.24, 2.38], [0.0, 2.41],
];
/** Horizontal (x) and depth (z) scale applied to the lathe; the head is slightly wider than deep. */
const SX = 1.06;
const SZ = 0.92;

const EAR_PROFILE: [number, number][] = [
  [0.0, 0.0], [0.13, 0.06], [0.17, 0.28], [0.15, 0.56], [0.1, 0.82], [0.04, 1.02], [0.0, 1.1],
];

const HOP_DURATION = 0.7;
/** Length of the shell fur on the body, in scene units. */
const FUR_LENGTH = 0.07;

function smoothCurve(points: [number, number][], samples: number): Vector2[] {
  const curve = new CatmullRomCurve3(points.map(([r, y]) => new Vector3(r, y, 0)), false, "centripetal");
  const sampled = curve.getPoints(samples).map((p) => new Vector2(Math.max(0, p.x), p.y));
  sampled[0].x = 0;
  sampled[sampled.length - 1].x = 0;
  return sampled;
}

const BODY_CURVE = smoothCurve(BODY_PROFILE, 120);

/** Lathe radius at height `y`, interpolated from the sampled body curve. */
function radiusAt(y: number): number {
  for (let i = 0; i < BODY_CURVE.length - 1; i++) {
    const a = BODY_CURVE[i];
    const b = BODY_CURVE[i + 1];
    if (y >= a.y && y <= b.y) return a.x + ((y - a.y) / Math.max(b.y - a.y, 1e-6)) * (b.x - a.x);
  }
  return 0;
}

/** Point on the body surface at height `y` and `angle` around the vertical axis (0 = facing the camera). */
function surfacePoint(y: number, angle: number, offset = 0): [number, number, number] {
  const r = radiusAt(y) + offset;
  return [Math.sin(angle) * r * SX, y, Math.cos(angle) * r * SZ];
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};

/** Writes a per-vertex colour attribute computed from each vertex position. */
function paint(geometry: BufferGeometry, colorAt: (x: number, y: number, z: number, out: Color) => void) {
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const c = new Color();
  for (let i = 0; i < position.count; i++) {
    colorAt(position.getX(i), position.getY(i), position.getZ(i), c);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return geometry;
}

function createBodyGeometry() {
  const geometry = new LatheGeometry(BODY_CURVE, 96);
  // Two brown stripes across the lower back.
  return paint(geometry, (x, y, z, out) => {
    const angle = Math.abs(Math.atan2(x, z));
    const back = smoothstep(2.0, 2.35, angle);
    const band = (center: number) => smoothstep(0.075, 0.045, Math.abs(y - center));
    out.copy(PALETTE.fur).lerp(PALETTE.stripe, back * Math.max(band(0.98), band(0.76)));
    // Ambient occlusion: less light reaches the base and the crease under the head.
    const base = 1 - smoothstep(0.0, 0.32, y);
    const crease = Math.exp(-(((y - 1.28) / 0.09) ** 2));
    out.multiplyScalar(1 - base * 0.32 - crease * 0.14);
  });
}

function createEarGeometry() {
  const geometry = new LatheGeometry(smoothCurve(EAR_PROFILE, 48), 40);
  geometry.scale(1, 1, 0.48); // flatten into a leaf shape
  return paint(geometry, (_x, y, _z, out) => out.copy(PALETTE.fur).lerp(PALETTE.earTip, smoothstep(0.7, 0.78, y)));
}

function createTailGeometry() {
  const points: [number, number][] = [
    [0, 0], [0.16, 0.26], [0.05, 0.31], [0.36, 0.66], [0.25, 0.71], [0.62, 1.18],
    [0.98, 0.96], [0.57, 0.6], [0.69, 0.55], [0.33, 0.22], [0.43, 0.17], [0.12, -0.06],
  ];
  const shape = new Shape();
  shape.moveTo(...points[0]);
  for (const p of points.slice(1)) shape.lineTo(...p);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelSize: 0.03,
    bevelThickness: 0.03,
    bevelSegments: 4,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -0.035);
  return paint(geometry, (_x, y, _z, out) => out.copy(PALETTE.fur).lerp(PALETTE.tailBase, smoothstep(0.24, 0.18, y)));
}

/** "ω" mouth as a thin tube following the face's curvature. */
function createMouthGeometry() {
  const y0 = 1.715;
  const local: [number, number][] = [
    [-0.085, 0.012], [-0.06, -0.022], [-0.03, -0.024], [-0.008, -0.002], [0, 0.006],
    [0.008, -0.002], [0.03, -0.024], [0.06, -0.022], [0.085, 0.012],
  ];
  const curve = new CatmullRomCurve3(
    local.map(([u, v]) => new Vector3(...surfacePoint(y0 + v, u / radiusAt(y0 + v), FUR_LENGTH * 0.8))),
  );
  return new TubeGeometry(curve, 48, 0.0085, 8, false);
}

/** Deterministic PRNG so the generated fur texture is identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fine, short fur strands encoded as a tangent-space normal map. */
function createFurNormalMap(): CanvasTexture {
  const size = 256;
  const height = new Float32Array(size * size);
  const rand = mulberry32(11);
  for (let i = 0; i < 14000; i++) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    const length = 3 + Math.floor(rand() * 9);
    const value = 0.4 + rand() * 0.6;
    for (let k = 0; k < length; k++) height[((y + k) % size) * size + x] += value * (1 - k / length);
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  const h = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 1.5;
      const dy = (h(x, y + 1) - h(x, y - 1)) * 1.5;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      image.data[o] = ((-dx / len) * 0.5 + 0.5) * 255;
      image.data[o + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      image.data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      image.data[o + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(10, 6);
  return texture;
}

export interface PikachuProps {
  animate: boolean;
  hopSignal: number;
}

export function Pikachu({ animate, hopSignal }: PikachuProps) {
  const root = useRef<Group>(null);
  const figure = useRef<Group>(null);
  const leftEar = useRef<Group>(null);
  const rightEar = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const eyes = useRef<Group[]>([]);
  const sparks = useRef<Mesh[]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  const hopStart = useRef<number | null>(null);
  const clock = useThree((state) => state.clock);

  const assets = useMemo(() => {
    const fur = createFurNormalMap();
    const furMaterial = (normalScale: number, vertexColors = true) =>
      new MeshPhysicalMaterial({
        vertexColors,
        color: vertexColors ? "#ffffff" : PALETTE.fur,
        roughness: 0.62,
        sheen: 1,
        sheenColor: new Color("#fff1a8"),
        sheenRoughness: 0.45,
        normalMap: fur,
        normalScale: new Vector2(normalScale, normalScale),
      });
    // Shell fur: short strands on the body and ears (see createFurShellMaterials).
    const strands = createStrandMask(21, [18, 11]);
    const shellBase = {
      vertexColors: true,
      roughness: 0.78,
      sheen: 1,
      sheenColor: new Color("#fff1a8"),
      sheenRoughness: 0.5,
    };
    return {
      fur,
      strands,
      bodyShells: createFurShellMaterials(12, FUR_LENGTH, shellBase, strands),
      earShells: createFurShellMaterials(6, FUR_LENGTH * 0.5, shellBase, strands),
      body: createBodyGeometry(),
      ear: createEarGeometry(),
      tail: createTailGeometry(),
      mouth: createMouthGeometry(),
      materials: {
        body: furMaterial(0.32),
        ear: furMaterial(0.2),
        tail: furMaterial(0.15),
        // Arms and feet are primitives without a colour attribute, so they use a solid fur colour.
        limb: furMaterial(0.25, false),
        eye: new MeshPhysicalMaterial({ color: PALETTE.eye, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }),
        highlight: new MeshBasicMaterial({ color: "#ffffff" }),
        cheek: new MeshPhysicalMaterial({ color: PALETTE.cheek, roughness: 0.45, sheen: 0.6, sheenColor: new Color("#ff9a8f") }),
        mouth: new MeshPhysicalMaterial({ color: PALETTE.mouth, roughness: 0.5 }),
        spark: new MeshBasicMaterial({
          color: PALETTE.spark,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      },
    };
  }, []);

  // Everything above is created imperatively, so release it explicitly on unmount.
  useEffect(
    () => () => {
      assets.fur.dispose();
      assets.strands.dispose();
      [assets.body, assets.ear, assets.tail, assets.mouth].forEach((g) => g.dispose());
      Object.values(assets.materials).forEach((m) => m.dispose());
      [...assets.bodyShells, ...assets.earShells].forEach((m) => m.dispose());
    },
    [assets],
  );

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, []);

  useEffect(() => {
    if (hopSignal > 0 && animate) hopStart.current = clock.elapsedTime;
  }, [hopSignal, animate, clock]);

  useFrame((_, delta) => {
    if (!animate || !root.current || !figure.current) return;
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // Hop: anticipation squash, airborne stretch, landing squash; sparks from the cheeks.
    let hop = 0;
    let stretch = 1;
    let sparkProgress = -1;
    if (hopStart.current !== null) {
      const p = (t - hopStart.current) / HOP_DURATION;
      if (p >= 1) {
        hopStart.current = null;
      } else {
        const arc = Math.sin(Math.min(Math.max((p - 0.12) / 0.76, 0), 1) * Math.PI);
        hop = arc * 0.42;
        if (p < 0.12) stretch = 1 - Math.sin((p / 0.12) * Math.PI) * 0.08;
        else if (p > 0.88) stretch = 1 - Math.sin(((p - 0.88) / 0.12) * Math.PI) * 0.08;
        else stretch = 1 + arc * 0.06;
        sparkProgress = p;
      }
    }
    root.current.position.y = Math.sin(t * 2.1) * 0.03 + hop;
    const s = 1 / Math.sqrt(stretch);
    figure.current.scale.set(s, stretch, s);

    for (const spark of sparks.current) {
      if (!spark) continue;
      const visible = sparkProgress >= 0;
      const flicker = visible ? 0.75 + 0.25 * Math.sin(t * 60) : 0;
      spark.scale.setScalar(visible ? 0.5 + sparkProgress * 2.6 : 0.001);
      (spark.material as MeshBasicMaterial).opacity = visible ? flicker * (1 - sparkProgress) : 0;
    }

    // Turn and tilt towards the pointer with easing, plus a slight idle head tilt.
    root.current.rotation.y += (pointer.current.x * 0.5 - root.current.rotation.y) * dt * 4;
    root.current.rotation.x += (pointer.current.y * 0.12 - root.current.rotation.x) * dt * 4;
    root.current.rotation.z = Math.sin(t * 0.9) * 0.025;

    // Blink roughly every 3.8 s.
    const blink = t % 3.8 < 0.13 ? 0.1 : 1;
    for (const eye of eyes.current) if (eye) eye.scale.y = blink;

    // Ear twitches and a tail wag.
    const twitch = t % 5.2 < 0.28 ? Math.sin(((t % 5.2) / 0.28) * Math.PI) * 0.22 : 0;
    if (leftEar.current) leftEar.current.rotation.z = 0.36 + twitch;
    if (rightEar.current) rightEar.current.rotation.z = -0.36 - twitch * 0.35;
    if (tail.current) tail.current.rotation.z = 0.12 + Math.sin(t * 3) * 0.1;
  });

  const { materials } = assets;

  const ear = (side: 1 | -1, ref: RefObject<Group | null>) => (
    <group ref={ref} position={[0.27 * side, 2.17, -0.04]} rotation={[-0.12, 0.25 * side, -0.36 * side]}>
      <mesh geometry={assets.ear} material={materials.ear} castShadow />
      {assets.earShells.map((shell, i) => (
        <mesh key={i} geometry={assets.ear} material={shell} />
      ))}
    </group>
  );

  const eyeAngle = 0.43;
  const cheekAngle = 0.86;

  return (
    <group ref={root}>
      <group ref={figure}>
        <mesh geometry={assets.body} material={materials.body} scale={[SX, 1, SZ]} castShadow receiveShadow />
        {assets.bodyShells.map((shell, i) => (
          <mesh key={i} geometry={assets.body} material={shell} scale={[SX, 1, SZ]} />
        ))}
        {ear(-1, leftEar)}
        {ear(1, rightEar)}

        {/* Eyes: glossy black with highlights, oriented to the surface. */}
        {([1, -1] as const).map((side, i) => (
          <group key={side} position={surfacePoint(1.86, eyeAngle * side, FUR_LENGTH * 0.55)} rotation={[0, eyeAngle * side, 0]}>
            <group
              ref={(g) => {
                if (g) eyes.current[i] = g;
              }}
            >
              <mesh scale={[0.92, 1.12, 0.55]} material={materials.eye}>
                <sphereGeometry args={[0.1, 32, 24]} />
              </mesh>
              <mesh position={[0.018, 0.04, 0.05]} material={materials.highlight}>
                <sphereGeometry args={[0.032, 16, 12]} />
              </mesh>
              <mesh position={[-0.02, -0.035, 0.05]} material={materials.highlight}>
                <sphereGeometry args={[0.012, 10, 8]} />
              </mesh>
            </group>
          </group>
        ))}

        {/* Cheeks, each with an electric spark ring used during a hop. */}
        {([1, -1] as const).map((side, i) => (
          <group key={side} position={surfacePoint(1.66, cheekAngle * side, FUR_LENGTH * 0.7)} rotation={[0, cheekAngle * side, 0]}>
            <mesh scale={[0.15, 0.135, 0.045]} material={materials.cheek}>
              <sphereGeometry args={[1, 32, 20]} />
            </mesh>
            <mesh
              ref={(m) => {
                if (m) sparks.current[i] = m;
              }}
              position={[0, 0, 0.05]}
              scale={0.001}
              material={materials.spark}
            >
              <ringGeometry args={[0.15, 0.19, 40]} />
            </mesh>
          </group>
        ))}

        {/* Nose and mouth */}
        <group position={surfacePoint(1.775, 0, FUR_LENGTH * 0.8)}>
          <mesh scale={[1.3, 0.8, 0.7]} material={materials.eye}>
            <sphereGeometry args={[0.022, 16, 12]} />
          </mesh>
        </group>
        <mesh geometry={assets.mouth} material={materials.mouth} />

        {/* Arms */}
        {([1, -1] as const).map((side) => (
          <group key={side} position={surfacePoint(1.02, 0.78 * side, -0.06)} rotation={[-1.05, 0.5 * side, 0.35 * side]}>
            <mesh material={materials.limb} castShadow>
              <capsuleGeometry args={[0.085, 0.2, 8, 16]} />
            </mesh>
          </group>
        ))}

        {/* Feet */}
        {([1, -1] as const).map((side) => (
          <mesh
            key={side}
            position={[0.3 * side, 0.06, 0.22]}
            rotation={[0, 0.25 * side, 0]}
            scale={[1, 0.52, 1.45]}
            material={materials.limb}
            castShadow
          >
            <sphereGeometry args={[0.17, 24, 16]} />
          </mesh>
        ))}

        {/* Tail */}
        <group ref={tail} position={[0.36, 0.5, -0.56]} rotation={[0, -0.45, 0.12]}>
          <mesh geometry={assets.tail} material={materials.tail} scale={1.15} castShadow />
        </group>
      </group>
    </group>
  );
}
