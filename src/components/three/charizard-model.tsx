"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  FrontSide,
  LatheGeometry,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PointsMaterial,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type PointLight,
  type Side,
  type Points,
} from "three";
import {
  createGlowTexture,
  createScaleNormalMap,
  mulberry32,
  paint,
  smoothstep,
  taperedTube,
} from "@/lib/three/procedural";

/*
 * A fan-made Charizard modelled procedurally (no third-party model or texture).
 *
 * Scaly skin (physically based material + generated scale normal map), cream
 * belly and throat via vertex colours, two-tone wing membranes, horns and claws.
 * The tail flame is layered additive geometry with a flickering point light
 * that illuminates the scene, plus rising embers. `breathSignal` increments to
 * trigger a burst of fire breath.
 */

const SKIN = new Color("#ee7a35");
const CREAM = new Color("#f6dc9c");
const SKIN_SHADE = new Color("#c9561f");
const MEMBRANE_ROOT = new Color("#1d6576");
const MEMBRANE_EDGE = new Color("#4fb6c2");
const FLAME_LAYERS = [
  { color: "#ff3a0a", radius: 0.32, stretch: 1.9, opacity: 0.7 },
  { color: "#ff8c1a", radius: 0.22, stretch: 1.75, opacity: 0.85 },
  { color: "#fff0a0", radius: 0.12, stretch: 1.5, opacity: 1 },
];
const BREATH_PARTICLES = 180;
const BREATH_DURATION = 1.15;
const EMBER_PARTICLES = 26;
const TAIL_TIP = new Vector3(0, 1.72, -2.06);
const MOUTH = new Vector3(0, -0.1, 0.6);

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

function createTorso() {
  const profile = [
    [0, 0.7], [0.42, 0.74], [0.68, 0.98], [0.79, 1.3], [0.78, 1.62],
    [0.69, 1.92], [0.55, 2.2], [0.42, 2.42], [0.32, 2.56], [0, 2.62],
  ];
  const curve = new CatmullRomCurve3(profile.map(([r, y]) => v(r, y, 0)), false, "centripetal");
  const points = curve.getPoints(80).map((p) => new Vector2(Math.max(0, p.x), p.y));
  points[0].x = 0;
  points[points.length - 1].x = 0;
  const geometry = new LatheGeometry(points, 64);
  geometry.scale(1, 1, 0.82);
  geometry.computeVertexNormals();
  // Cream belly on the front.
  return paint(geometry, (p, _n, out) => {
    const angle = Math.abs(Math.atan2(p.x, p.z / 0.82));
    const front = 1 - smoothstep(0.7, 1.05, angle);
    const band = smoothstep(0.82, 1.0, p.y) * (1 - smoothstep(2.3, 2.48, p.y));
    out.copy(SKIN).lerp(SKIN_SHADE, smoothstep(1.6, 3.0, angle) * 0.55).lerp(CREAM, front * band);
    // Ambient occlusion on the underside, where the legs meet the body.
    out.multiplyScalar(1 - (1 - smoothstep(0.7, 1.15, p.y)) * 0.3);
  });
}

function createNeck() {
  const curve = new CatmullRomCurve3([v(0, 2.3, -0.02), v(0, 2.62, 0.1), v(0, 2.9, 0.24), v(0, 3.1, 0.34)]);
  const geometry = taperedTube(curve, (t) => 0.37 - t * 0.12, 32, 24);
  // Cream throat.
  return paint(geometry, (_p, n, out) =>
    out.copy(SKIN).lerp(SKIN_SHADE, smoothstep(-0.2, -0.8, n.z) * 0.55).lerp(CREAM, smoothstep(0.15, 0.5, n.z)),
  );
}

/** Leading edge of the wing, root to tip (x outward, y up). */
const WING_LEADING_EDGE: [number, number][] = [[0, 0], [0.35, 0.55], [0.9, 1.05], [1.55, 1.35], [2.1, 1.45]];
/** Trailing edge, tip back to root: each entry is [end point, scallop control point]. */
const WING_SCALLOPS: [[number, number], [number, number]][] = [
  [[1.98, 0.62], [1.86, 1.02]],
  [[1.5, 0.08], [1.58, 0.5]],
  [[0.9, -0.16], [1.08, 0.18]],
  [[0.3, -0.26], [0.56, -0.02]],
  [[0, -0.12], [0.12, -0.08]],
];

function createWing() {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.splineThru(WING_LEADING_EDGE.slice(1).map(([x, y]) => new Vector2(x, y)));
  for (const [[x, y], [cx, cy]] of WING_SCALLOPS) shape.quadraticCurveTo(cx, cy, x, y);
  shape.closePath();
  const membrane = new ShapeGeometry(shape, 16);
  // Cup the membrane backwards so it catches the light like a real wing.
  const bend = (x: number) => -0.085 * x * x;
  const positions = membrane.getAttribute("position");
  for (let i = 0; i < positions.count; i++) positions.setZ(i, bend(positions.getX(i)));
  membrane.computeVertexNormals();

  // Darker, thicker membrane near the body; lighter towards the edge.
  paint(membrane, (p, _n, out) => out.copy(MEMBRANE_ROOT).lerp(MEMBRANE_EDGE, smoothstep(0.2, 2.0, Math.hypot(p.x, p.y))));

  const edge = new CatmullRomCurve3(WING_LEADING_EDGE.map(([x, y]) => v(x, y, bend(x) + 0.01)));
  const bone = taperedTube(edge, (t) => 0.075 - t * 0.055, 40, 12);

  // Finger bones radiate from the wrist to each scallop point, like a bat wing.
  const wrist: [number, number] = WING_LEADING_EDGE[2];
  const fingers = WING_SCALLOPS.slice(0, 3).map(([[x, y]]) => {
    const mx = (wrist[0] + x) / 2;
    const my = (wrist[1] + y) / 2 + 0.05;
    const curve = new CatmullRomCurve3([v(...wrist, bend(wrist[0]) + 0.012), v(mx, my, bend(mx) + 0.012), v(x, y, bend(x) + 0.012)]);
    return taperedTube(curve, (t) => 0.036 - t * 0.026, 24, 8);
  });
  return { membrane, bone, fingers };
}

/** Mouth line wrapping around the snout (head-local coordinates). */
function createMouth() {
  const points: Vector3[] = [];
  for (let a = -1.25; a <= 1.25001; a += 0.125) {
    // Snout ellipsoid: centre (0, -0.07, 0.28), radii 0.21 x 0.168 x 0.252.
    points.push(v(Math.sin(a) * 0.212, -0.112 + Math.abs(a) * 0.012, 0.28 + Math.cos(a) * 0.25));
  }
  return taperedTube(new CatmullRomCurve3(points), () => 0.007, 48, 6);
}

function createTail() {
  const curve = new CatmullRomCurve3([v(0, 1.0, -0.38), v(0, 0.68, -0.95), v(0, 0.74, -1.5), v(0, 1.14, -1.9), TAIL_TIP.clone().setY(1.64)]);
  return taperedTube(curve, (t) => 0.27 * (1 - t) + 0.07, 56, 20);
}

function createLimb(points: Vector3[], from: number, to: number) {
  return taperedTube(new CatmullRomCurve3(points), (t) => from + (to - from) * t, 24, 16);
}

/** A particle buffer whose per-vertex colour doubles as fade (additive blending). */
function createParticleGeometry(count: number) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(count * 3), 3));
  return geometry;
}

export interface CharizardProps {
  animate: boolean;
  breathSignal: number;
}

export function Charizard({ animate, breathSignal }: CharizardProps) {
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const wings = useRef<Group[]>([]);
  const flames = useRef<Mesh[]>([]);
  const light = useRef<PointLight>(null);
  const embers = useRef<Points>(null);
  const breath = useRef<Points>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const breathStart = useRef<number | null>(null);
  const clock = useThree((state) => state.clock);

  const assets = useMemo(() => {
    const scales = createScaleNormalMap();
    const glow = createGlowTexture();
    const skin = (vertexColors: boolean, side: Side = FrontSide) =>
      new MeshPhysicalMaterial({
        vertexColors,
        color: vertexColors ? "#ffffff" : SKIN,
        roughness: 0.46,
        clearcoat: 0.35,
        clearcoatRoughness: 0.45,
        sheen: 0.35,
        sheenColor: new Color("#ffb27a"),
        normalMap: scales,
        normalScale: new Vector2(0.55, 0.55),
        side,
      });
    const wing = createWing();
    const limbs = {
      arm: createLimb([v(0.5, 2.05, 0.2), v(0.68, 1.82, 0.38), v(0.7, 1.6, 0.62)], 0.13, 0.085),
      shin: createLimb([v(0.42, 0.95, 0.05), v(0.45, 0.56, 0.08), v(0.45, 0.26, 0.2)], 0.16, 0.11),
      horn: createLimb([v(0.12, 0.12, -0.1), v(0.17, 0.22, -0.3), v(0.21, 0.32, -0.5)], 0.065, 0.012),
    };
    const rand = mulberry32(9);
    return {
      scales,
      glow,
      rand,
      torso: createTorso(),
      mouth: createMouth(),
      neck: createNeck(),
      tail: createTail(),
      wing,
      limbs,
      emberGeometry: createParticleGeometry(EMBER_PARTICLES),
      breathGeometry: createParticleGeometry(BREATH_PARTICLES),
      materials: {
        skinPainted: skin(true),
        skin: skin(false),
        wingInner: new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.5, sheenColor: new Color("#7fd6e0"), side: FrontSide }),
        wingOuter: skin(false, BackSide),
        claw: new MeshPhysicalMaterial({ color: "#f3ede0", roughness: 0.32, clearcoat: 0.6 }),
        eye: new MeshPhysicalMaterial({ color: "#1d6b74", roughness: 0.15, clearcoat: 1 }),
        pupil: new MeshBasicMaterial({ color: "#050505" }),
        highlight: new MeshBasicMaterial({ color: "#ffffff" }),
        dark: new MeshPhysicalMaterial({ color: "#3a1a0c", roughness: 0.6 }),
        flames: FLAME_LAYERS.map(
          (layer) =>
            new MeshBasicMaterial({
              color: layer.color,
              transparent: true,
              opacity: layer.opacity,
              depthWrite: false,
              blending: AdditiveBlending,
            }),
        ),
        embers: new PointsMaterial({
          size: 0.13,
          map: glow,
          vertexColors: true,
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
          sizeAttenuation: true,
        }),
        breath: new PointsMaterial({
          size: 0.42,
          map: glow,
          vertexColors: true,
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
          sizeAttenuation: true,
        }),
      },
    };
  }, []);

  // Per-particle simulation state (positions live in the geometry buffers).
  const sim = useMemo(
    () => ({
      // `age` past `life` makes every ember respawn at the flame on the first frame.
      ember: Array.from({ length: EMBER_PARTICLES }, () => ({ age: 99, life: 1, vx: 0, vy: 0, vz: 0 })),
      breath: Array.from({ length: BREATH_PARTICLES }, () => ({ age: 99, life: 1, vx: 0, vy: 0, vz: 0, delay: 0 })),
    }),
    [],
  );

  // Geometries, materials and textures are created imperatively, so release them on unmount.
  useEffect(
    () => () => {
      const { materials } = assets;
      [assets.torso, assets.neck, assets.tail, assets.wing.membrane, assets.wing.bone, assets.mouth, assets.emberGeometry, assets.breathGeometry]
        .concat(Object.values(assets.limbs), assets.wing.fingers)
        .forEach((g) => g.dispose());
      [materials.skinPainted, materials.skin, materials.wingInner, materials.wingOuter, materials.claw, materials.eye, materials.pupil, materials.highlight, materials.dark, materials.embers, materials.breath]
        .concat(materials.flames)
        .forEach((m) => m.dispose());
      assets.scales.dispose();
      assets.glow.dispose();
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
    if (breathSignal === 0 || !animate) return;
    breathStart.current = clock.elapsedTime;
    sim.breath.forEach((p, i) => {
      p.delay = (i / BREATH_PARTICLES) * BREATH_DURATION * 0.65;
      p.age = -p.delay;
    });
  }, [breathSignal, animate, clock, sim]);

  useFrame((_, delta) => {
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const { rand } = assets;

    // Flame flicker (skipped with reduced motion, which renders a single static frame).
    if (animate) {
      flames.current.forEach((flame, i) => {
        if (!flame) return;
        const layer = FLAME_LAYERS[i];
        const flicker = 1 + Math.sin(t * 23 + i * 2.1) * 0.12 + Math.sin(t * 37 + i) * 0.08;
        flame.scale.set(layer.radius * (2 - flicker) * 0.95, layer.radius * layer.stretch * flicker, layer.radius * (2 - flicker) * 0.95);
      });
      if (light.current) light.current.intensity = 5.5 + Math.sin(t * 19) * 1.1 + Math.sin(t * 31) * 0.7;
    }

    if (!animate || !root.current) return;

    // Hover with wing beats: the down-stroke lifts the body.
    const beat = t * 4.2;
    root.current.position.y = 0.45 + Math.sin(beat - 0.6) * 0.09;
    root.current.rotation.y += (pointer.current.x * 0.3 - root.current.rotation.y) * dt * 2.5;
    root.current.rotation.x = Math.sin(beat - 0.6) * 0.03;
    wings.current.forEach((wing, i) => {
      if (!wing) return;
      const side = i === 0 ? 1 : -1;
      wing.rotation.y = side * (-0.42 + Math.sin(beat) * 0.42);
      wing.rotation.z = side * Math.sin(beat) * 0.12;
    });
    if (head.current) {
      head.current.rotation.y += (pointer.current.x * 0.45 - head.current.rotation.y) * dt * 4;
      head.current.rotation.x += (pointer.current.y * 0.2 - 0.05 - head.current.rotation.x) * dt * 4;
    }
    if (tail.current) tail.current.rotation.y = Math.sin(t * 1.3) * 0.12;

    // Embers rising from the tail flame.
    if (embers.current) {
      const pos = assets.emberGeometry.getAttribute("position") as BufferAttribute;
      const col = assets.emberGeometry.getAttribute("color") as BufferAttribute;
      sim.ember.forEach((p, i) => {
        p.age += dt;
        if (p.age >= p.life) {
          p.age = 0;
          p.life = 0.7 + rand() * 0.9;
          p.vx = (rand() - 0.5) * 0.35;
          p.vy = 0.6 + rand() * 0.7;
          p.vz = (rand() - 0.5) * 0.35;
          pos.setXYZ(i, TAIL_TIP.x + (rand() - 0.5) * 0.1, TAIL_TIP.y + 0.1, TAIL_TIP.z + (rand() - 0.5) * 0.1);
        } else {
          pos.setXYZ(i, pos.getX(i) + p.vx * dt, pos.getY(i) + p.vy * dt, pos.getZ(i) + p.vz * dt);
        }
        const fade = 1 - p.age / p.life;
        col.setXYZ(i, 1 * fade, 0.55 * fade * fade, 0.15 * fade * fade);
      });
      pos.needsUpdate = true;
      col.needsUpdate = true;
    }

    // Fire breath: particles stream from the mouth, cooling from white-yellow to red smoke.
    if (breath.current) {
      const pos = assets.breathGeometry.getAttribute("position") as BufferAttribute;
      const col = assets.breathGeometry.getAttribute("color") as BufferAttribute;
      const active = breathStart.current !== null && t - breathStart.current < BREATH_DURATION + 0.8;
      sim.breath.forEach((p, i) => {
        if (!active) {
          col.setXYZ(i, 0, 0, 0);
          return;
        }
        const wasPending = p.age < 0;
        p.age += dt;
        if (p.age < 0) {
          col.setXYZ(i, 0, 0, 0);
          return;
        }
        if (wasPending) {
          p.life = 0.55 + rand() * 0.35;
          const speed = 2.6 + rand() * 1.6;
          p.vx = (rand() - 0.5) * 1.4;
          p.vy = (rand() - 0.4) * 1.1;
          p.vz = speed;
          pos.setXYZ(i, MOUTH.x, MOUTH.y, MOUTH.z);
        } else {
          pos.setXYZ(i, pos.getX(i) + p.vx * dt, pos.getY(i) + (p.vy + p.age * 0.8) * dt, pos.getZ(i) + p.vz * dt);
          p.vx *= 1 + dt * 1.5; // spread out as it travels
        }
        const life = Math.min(p.age / p.life, 1);
        const heat = 1 - life;
        col.setXYZ(i, heat > 0 ? 1 * heat + 0.2 : 0, heat > 0 ? 0.85 * heat * heat : 0, heat > 0 ? 0.45 * heat ** 4 : 0);
      });
      if (!active) breathStart.current = null;
      pos.needsUpdate = true;
      col.needsUpdate = true;
    }
  });

  const { materials, limbs, wing } = assets;
  const sides = [1, -1] as const;

  const claws = (count: number, length: number, spread: number) =>
    Array.from({ length: count }, (_, i) => {
      const offset = (i - (count - 1) / 2) * spread;
      return (
        <mesh key={i} position={[offset, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.claw}>
          <coneGeometry args={[length * 0.28, length, 10]} />
        </mesh>
      );
    });

  return (
    <group ref={root} position={[0, 0.45, 0]}>
      <mesh geometry={assets.torso} material={materials.skinPainted} castShadow />
      <mesh geometry={assets.neck} material={materials.skinPainted} castShadow />

      {/* Head */}
      <group ref={head} position={[0, 3.2, 0.42]} scale={1.3}>
        <mesh scale={[1, 0.88, 1.1]} material={materials.skin} castShadow>
          <sphereGeometry args={[0.3, 40, 28]} />
        </mesh>
        <mesh position={[0, -0.07, 0.28]} scale={[0.88, 0.7, 1.05]} material={materials.skin} castShadow>
          <sphereGeometry args={[0.24, 36, 24]} />
        </mesh>
        {sides.map((side) => (
          <group key={side}>
            {/* Brow ridge for Charizard's fierce look */}
            <mesh position={[0.15 * side, 0.085, 0.255]} rotation={[0, 0.55 * side, -0.4 * side]} scale={[0.11, 0.032, 0.06]} material={materials.skin}>
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
            <group position={[0.165 * side, 0.025, 0.262]} rotation={[0, 0.62 * side, 0]}>
              <mesh scale={[1, 0.78, 0.5]} material={materials.eye}>
                <sphereGeometry args={[0.058, 20, 14]} />
              </mesh>
              <mesh position={[0, 0, 0.022]} scale={[0.45, 0.9, 0.4]} material={materials.pupil}>
                <sphereGeometry args={[0.04, 12, 10]} />
              </mesh>
              <mesh position={[0.016, 0.018, 0.03]} material={materials.highlight}>
                <sphereGeometry args={[0.011, 8, 6]} />
              </mesh>
            </group>
            <mesh geometry={limbs.horn} material={materials.skin} scale={[side, 1, 1]} castShadow />
            <mesh position={[0.05 * side, -0.03, 0.57]} material={materials.dark}>
              <sphereGeometry args={[0.014, 8, 6]} />
            </mesh>
          </group>
        ))}
        {/* Mouth line and fangs */}
        <mesh geometry={assets.mouth} material={materials.dark} />
        {sides.map((side) => (
          <mesh key={side} position={[0.065 * side, -0.128, 0.48]} rotation={[Math.PI, 0, 0]} material={materials.claw}>
            <coneGeometry args={[0.013, 0.05, 8]} />
          </mesh>
        ))}
        <points ref={breath} geometry={assets.breathGeometry} material={materials.breath} frustumCulled={false} />
      </group>

      {/* Arms with claws */}
      {sides.map((side) => (
        <group key={side} scale={[side, 1, 1]}>
          <mesh geometry={limbs.arm} material={materials.skin} castShadow />
          <group position={[0.7, 1.58, 0.66]}>{claws(3, 0.09, 0.04)}</group>
        </group>
      ))}

      {/* Legs and feet */}
      {sides.map((side) => (
        <group key={side} scale={[side, 1, 1]}>
          <mesh position={[0.46, 1.05, 0.06]} scale={[1.05, 1.2, 1.15]} material={materials.skin} castShadow>
            <sphereGeometry args={[0.3, 32, 24]} />
          </mesh>
          <mesh geometry={limbs.shin} material={materials.skin} castShadow />
          <mesh position={[0.45, 0.13, 0.3]} scale={[0.85, 0.45, 1.4]} material={materials.skin} castShadow>
            <sphereGeometry args={[0.2, 24, 16]} />
          </mesh>
          <group position={[0.45, 0.1, 0.6]}>{claws(3, 0.1, 0.07)}</group>
        </group>
      ))}

      {/* Wings: teal membrane facing forward, orange on the back */}
      {sides.map((side, i) => (
        <group
          key={side}
          ref={(g) => {
            if (g) wings.current[i] = g;
          }}
          position={[0.3 * side, 2.2, -0.34]}
          rotation={[0.12, side * -0.42, 0]}
        >
          <group scale={[side, 1, 1]}>
            <mesh geometry={wing.membrane} material={materials.wingInner} castShadow />
            <mesh geometry={wing.membrane} material={materials.wingOuter} />
            <mesh geometry={wing.bone} material={materials.skin} castShadow />
            {wing.fingers.map((finger, f) => (
              <mesh key={f} geometry={finger} material={materials.skin} />
            ))}
          </group>
        </group>
      ))}

      {/* Tail with its flame, light and embers */}
      <group ref={tail}>
        <mesh geometry={assets.tail} material={materials.skin} castShadow />
        <group position={TAIL_TIP.toArray()}>
          {FLAME_LAYERS.map((layer, i) => (
            <mesh
              key={layer.color}
              ref={(m) => {
                if (m) flames.current[i] = m;
              }}
              position={[0, layer.radius * 0.9, 0]}
              scale={[layer.radius, layer.radius * layer.stretch, layer.radius]}
              material={materials.flames[i]}
            >
              <sphereGeometry args={[1, 20, 16]} />
            </mesh>
          ))}
          <pointLight ref={light} color="#ff8a2a" intensity={5.5} distance={7} decay={2} position={[0, 0.25, 0]} />
        </group>
        <points ref={embers} geometry={assets.emberGeometry} material={materials.embers} frustumCulled={false} />
      </group>
    </group>
  );
}
