"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  LatheGeometry,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PointsMaterial,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type PointLight,
  type Points,
} from "three";
import {
  createGlowTexture,
  createLatheSurface,
  createScaleNormalMap,
  mulberry32,
  paint,
  projectOntoSurface,
  smoothstep,
  surfaceTube,
  taperedTube,
} from "@/lib/three/procedural";

/*
 * A fan-made Gengar modelled procedurally (no third-party model or texture).
 *
 * Round velvety body with ambient-occlusion shading, back spikes and ears,
 * glowing red eyes and the signature grin projected onto the curved face.
 * Levitates with drifting shadow wisps; `actionSignal` increments to charge and
 * launch a Shadow Ball.
 */

const BODY = new Color("#6c53a4");
const BODY_DARK = new Color("#2e2149");
const SX = 1.08;
const SZ = 0.9;
const SURFACE = createLatheSurface(
  [[0, 0], [0.45, 0.04], [0.78, 0.22], [0.92, 0.55], [0.95, 0.9], [0.9, 1.22], [0.78, 1.5], [0.58, 1.72], [0.32, 1.86], [0, 1.9]],
  SX,
  SZ,
);
const EYE_Y = 1.33;
const MOUTH_Y = 1.07;
const EYE_CENTER = 0.27;
const EYE_SCALE = 1.4;
const GRIN_SCALE = 0.84;
const FEATURE_OFFSET = 0.006;
const WISPS = 22;
const SHADOW_BALL_CHARGE = 0.45;
const SHADOW_BALL_FLIGHT = 0.75;
const BALL_START = new Vector3(0, 0.95, 1.0);

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

function createBody() {
  const geometry = new LatheGeometry(SURFACE.points.map((p) => new Vector2(p.x, p.y)), 72);
  geometry.scale(SX, 1, SZ);
  geometry.computeVertexNormals();
  // Ambient occlusion: the underside and lower body receive less light.
  return paint(geometry, (p, n, out) => {
    const underside = 1 - smoothstep(-0.9, 0.2, n.y);
    const low = 1 - smoothstep(0.05, 0.55, p.y);
    out.copy(BODY).lerp(BODY_DARK, Math.min(1, underside * 0.55 + low * 0.35));
  });
}

/** Angry slanted eye for the right side of the face (mirror for the left). */
function createEyeShape(center: number): Shape {
  const points: [number, number][] = [[-0.15, -0.035], [-0.06, 0.04], [0.1, 0.085], [0.165, 0.03], [0.08, -0.05], [-0.08, -0.07]];
  const shape = new Shape();
  const [x0, y0] = points[0];
  shape.moveTo(center + x0, y0);
  shape.splineThru(points.slice(1).concat([points[0]]).map(([x, y]) => new Vector2(center + x, y)));
  return shape;
}

function createGrinShape(): Shape {
  const shape = new Shape();
  shape.moveTo(-0.46, 0.05);
  shape.quadraticCurveTo(0, -0.12, 0.46, 0.05);
  shape.quadraticCurveTo(0.3, -0.36, 0, -0.38);
  shape.quadraticCurveTo(-0.3, -0.36, -0.46, 0.05);
  return shape;
}

/** Grin outline, the gum line between upper and lower teeth, and tooth separators. */
function createGrinLines(): BufferGeometry[] {
  const quad = (a: [number, number], c: [number, number], b: [number, number], steps = 16): [number, number][] =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      return [
        (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
        (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
      ];
    });
  const outline = [
    ...quad([-0.46, 0.05], [0, -0.12], [0.46, 0.05]),
    ...quad([0.46, 0.05], [0.3, -0.36], [0, -0.38]).slice(1),
    ...quad([0, -0.38], [-0.3, -0.36], [-0.46, 0.05]).slice(1),
  ];
  const middle = quad([-0.4, -0.02], [0, -0.3], [0.4, -0.02]);
  const lines: [number, number][][] = [outline, middle];
  // Separators between teeth, from the upper edge down to the lower edge.
  for (const u of [-0.3, -0.15, 0, 0.15, 0.3]) {
    // Upper edge rises from -0.035 (centre) to 0.05 (corners); lower edge from -0.38; inset slightly.
    const k = (u / 0.46) ** 2;
    const top = -0.035 + 0.085 * k - 0.01;
    const bottom = -0.38 + 0.43 * k + 0.02;
    lines.push([[u, top], [u, bottom]]);
  }
  return lines.map((line) =>
    surfaceTube(line.map(([u, w]) => [u * GRIN_SCALE, w * GRIN_SCALE]), SURFACE, MOUTH_Y, FEATURE_OFFSET + 0.004, 0.0075),
  );
}

/** Rotation that points a +Y cone along `direction`. */
function pointAlong(direction: Vector3): [number, number, number, number] {
  return new Quaternion().setFromUnitVectors(v(0, 1, 0), direction.clone().normalize()).toArray() as [number, number, number, number];
}

/** Back spikes: [height, angle around body, length]. */
const SPIKES: [number, number, number][] = [
  // Along the sides, angled outward so they show in the front silhouette.
  [1.62, 1.85, 0.36], [1.62, -1.85, 0.36], [1.38, 1.75, 0.42], [1.38, -1.75, 0.42],
  [1.12, 1.8, 0.38], [1.12, -1.8, 0.38], [0.86, 1.9, 0.3], [0.86, -1.9, 0.3],
  // Crest over the top and down the back.
  [1.8, 2.5, 0.34], [1.8, -2.5, 0.34], [1.74, Math.PI, 0.4], [1.48, 2.6, 0.38], [1.48, -2.6, 0.38],
  [1.2, Math.PI, 0.36], [1.0, 2.5, 0.3], [1.0, -2.5, 0.3],
];

function createParticles(count: number) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(count * 3), 3));
  return geometry;
}

export interface GengarProps {
  animate: boolean;
  actionSignal: number;
}

export function Gengar({ animate, actionSignal }: GengarProps) {
  const root = useRef<Group>(null);
  const ball = useRef<Group>(null);
  const ballLight = useRef<PointLight>(null);
  const ballCore = useRef<Mesh>(null);
  const ballGlow = useRef<Mesh>(null);
  const eyeMaterialRef = useRef<MeshPhysicalMaterial | null>(null);
  const wisps = useRef<Points>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const actionStart = useRef<number | null>(null);
  const clock = useThree((state) => state.clock);

  const assets = useMemo(() => {
    const skinNormal = createScaleNormalMap(17);
    skinNormal.repeat.set(10, 10);
    const glow = createGlowTexture();
    const skin = (vertexColors: boolean) =>
      new MeshPhysicalMaterial({
        vertexColors,
        color: vertexColors ? "#ffffff" : BODY,
        roughness: 0.72,
        sheen: 0.4,
        sheenColor: new Color("#a993f0"),
        sheenRoughness: 0.6,
        normalMap: skinNormal,
        normalScale: new Vector2(0.12, 0.12),
      });
    const eyes = [1, -1].map((side) => {
      const geometry = new ShapeGeometry(createEyeShape(0), 12);
      geometry.scale(EYE_SCALE, EYE_SCALE, 1);
      geometry.translate(EYE_CENTER, 0, 0);
      if (side === -1) geometry.scale(-1, 1, 1);
      return projectOntoSurface(geometry, SURFACE, EYE_Y, FEATURE_OFFSET);
    });
    const pupils = [1, -1].map((side) => {
      const shape = new Shape();
      shape.absellipse((EYE_CENTER + 0.03) * side, 0.01, 0.026, 0.04, 0, Math.PI * 2, false, 0);
      return projectOntoSurface(new ShapeGeometry(shape, 16), SURFACE, EYE_Y, FEATURE_OFFSET + 0.003);
    });
    const ears = [1, -1].map((side) =>
      taperedTube(new CatmullRomCurve3([v(0.38 * side, 1.6, -0.04), v(0.66 * side, 2.02, -0.07), v(0.98 * side, 2.42, -0.1)]), (t) => 0.27 * (1 - t) + 0.006, 32, 18),
    );
    const arms = [1, -1].map((side) =>
      taperedTube(new CatmullRomCurve3([v(0.84 * side, 1.0, 0.14), v(1.14 * side, 1.02, 0.3), v(1.28 * side, 0.98, 0.48)]), (t) => 0.17 - t * 0.06, 24, 14),
    );
    const legs = [1, -1].map((side) =>
      taperedTube(new CatmullRomCurve3([v(0.42 * side, 0.32, 0.1), v(0.5 * side, 0.12, 0.22), v(0.54 * side, 0.02, 0.36)]), (t) => 0.22 - t * 0.04, 20, 14),
    );
    return {
      skinNormal,
      glow,
      rand: mulberry32(5),
      body: createBody(),
      eyes,
      pupils,
      grin: projectOntoSurface(new ShapeGeometry(createGrinShape(), 24).scale(GRIN_SCALE, GRIN_SCALE, 1), SURFACE, MOUTH_Y, FEATURE_OFFSET),
      grinLines: createGrinLines(),
      ears,
      arms,
      legs,
      wispGeometry: createParticles(WISPS),
      materials: {
        body: skin(true),
        skin: skin(false),
        eye: new MeshPhysicalMaterial({ color: "#ff3344", emissive: new Color("#ff1a2e"), emissiveIntensity: 0.55, roughness: 0.25, clearcoat: 1, side: DoubleSide }),
        pupil: new MeshBasicMaterial({ color: "#1a0508", side: DoubleSide }),
        teeth: new MeshPhysicalMaterial({ color: "#f4f1ea", roughness: 0.35, clearcoat: 0.6, side: DoubleSide }),
        lines: new MeshPhysicalMaterial({ color: "#1a1028", roughness: 0.6 }),
        claw: new MeshPhysicalMaterial({ color: "#4a3a76", roughness: 0.5 }),
        ballCore: new MeshBasicMaterial({ color: "#1a0833", transparent: true, opacity: 0 }),
        ballGlow: new MeshBasicMaterial({ color: "#8b5cf6", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }),
        wisps: new PointsMaterial({
          size: 0.28,
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

  const spikeTransforms = useMemo(
    () =>
      SPIKES.map(([y, angle, length]) => {
        const position = SURFACE.surfacePoint(y, angle, -0.04);
        const direction = v(Math.sin(angle), 0.32, Math.cos(angle));
        return { position, quaternion: pointAlong(direction), length };
      }),
    [],
  );

  const sim = useMemo(() => Array.from({ length: WISPS }, () => ({ age: 99, life: 1, vx: 0, vy: 0, vz: 0 })), []);

  useEffect(() => {
    eyeMaterialRef.current = assets.materials.eye;
    return () => {
      [assets.body, assets.grin, assets.wispGeometry, ...assets.eyes, ...assets.pupils, ...assets.grinLines, ...assets.ears, ...assets.arms, ...assets.legs].forEach((g) =>
        g.dispose(),
      );
      Object.values(assets.materials).forEach((m) => m.dispose());
      assets.skinNormal.dispose();
      assets.glow.dispose();
    };
  }, [assets]);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, []);

  useEffect(() => {
    if (actionSignal > 0 && animate) actionStart.current = clock.elapsedTime;
  }, [actionSignal, animate, clock]);

  useFrame((_, delta) => {
    if (!animate || !root.current) return;
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const { rand } = assets;

    // Levitate and sway like a ghost; turn towards the pointer.
    root.current.position.y = 0.28 + Math.sin(t * 1.7) * 0.1;
    root.current.rotation.z = Math.sin(t * 1.1) * 0.05;
    root.current.rotation.y += (pointer.current.x * 0.35 - root.current.rotation.y) * dt * 3;
    root.current.rotation.x += (pointer.current.y * 0.1 - root.current.rotation.x) * dt * 3;
    if (eyeMaterialRef.current) eyeMaterialRef.current.emissiveIntensity = 0.5 + Math.sin(t * 2.4) * 0.15;

    // Shadow Ball: charge between the hands, then launch forward and fade.
    if (ball.current && ballLight.current) {
      let scale = 0.001;
      let opacity = 0;
      let z = BALL_START.z;
      if (actionStart.current !== null) {
        const elapsed = t - actionStart.current;
        if (elapsed < SHADOW_BALL_CHARGE) {
          const p = elapsed / SHADOW_BALL_CHARGE;
          scale = 0.05 + p * 0.25;
          opacity = p;
        } else if (elapsed < SHADOW_BALL_CHARGE + SHADOW_BALL_FLIGHT) {
          const p = (elapsed - SHADOW_BALL_CHARGE) / SHADOW_BALL_FLIGHT;
          scale = 0.3 + p * 0.1;
          opacity = 1 - p;
          z = BALL_START.z + p * p * 4.5;
        } else {
          actionStart.current = null;
        }
      }
      const pulse = 1 + Math.sin(t * 30) * 0.06;
      ball.current.position.z = z;
      ball.current.scale.setScalar(scale * pulse);
      if (ballCore.current) (ballCore.current.material as MeshBasicMaterial).opacity = opacity;
      if (ballGlow.current) (ballGlow.current.material as MeshBasicMaterial).opacity = opacity * 0.85;
      ballLight.current.intensity = opacity * 4;
    }

    // Shadow wisps drifting up and away from the body.
    const pos = assets.wispGeometry.getAttribute("position") as BufferAttribute;
    const col = assets.wispGeometry.getAttribute("color") as BufferAttribute;
    sim.forEach((p, i) => {
      p.age += dt;
      if (p.age >= p.life) {
        p.age = 0;
        p.life = 1.4 + rand() * 1.2;
        const angle = rand() * Math.PI * 2;
        const [sx, sy, sz] = SURFACE.surfacePoint(0.3 + rand() * 1.4, angle, 0.02);
        pos.setXYZ(i, sx, sy, sz);
        p.vx = Math.sin(angle) * 0.12;
        p.vy = 0.18 + rand() * 0.2;
        p.vz = Math.cos(angle) * 0.12;
      } else {
        pos.setXYZ(i, pos.getX(i) + p.vx * dt, pos.getY(i) + p.vy * dt, pos.getZ(i) + p.vz * dt);
      }
      const life = p.age / p.life;
      const fade = Math.sin(life * Math.PI) * 0.35;
      col.setXYZ(i, 0.45 * fade, 0.22 * fade, 0.85 * fade);
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  const { materials } = assets;

  return (
    <group ref={root} position={[0, 0.28, 0]}>
      <mesh geometry={assets.body} material={materials.body} castShadow receiveShadow />
      {assets.ears.map((ear, i) => (
        <mesh key={i} geometry={ear} material={materials.skin} scale={[1, 1, 0.5]} castShadow />
      ))}
      {spikeTransforms.map((spike, i) => (
        <mesh key={i} position={spike.position} quaternion={spike.quaternion} material={materials.skin} castShadow>
          <coneGeometry args={[spike.length * 0.38, spike.length, 4]} />
        </mesh>
      ))}

      {/* Face */}
      {assets.eyes.map((eye, i) => (
        <mesh key={i} geometry={eye} material={materials.eye} />
      ))}
      {assets.pupils.map((pupil, i) => (
        <mesh key={i} geometry={pupil} material={materials.pupil} />
      ))}
      <mesh geometry={assets.grin} material={materials.teeth} />
      {assets.grinLines.map((line, i) => (
        <mesh key={i} geometry={line} material={materials.lines} />
      ))}

      {/* Arms with three claws, short legs with two toes */}
      {assets.arms.map((arm, i) => {
        const side = i === 0 ? 1 : -1;
        return (
          <group key={i}>
            <mesh geometry={arm} material={materials.skin} castShadow />
            {[-0.06, 0, 0.06].map((offset) => (
              <mesh key={offset} position={[1.3 * side, 0.98 + offset * 1.2, 0.58]} rotation={[Math.PI / 2, 0, 0]} material={materials.claw}>
                <coneGeometry args={[0.035, 0.14, 10]} />
              </mesh>
            ))}
          </group>
        );
      })}
      {assets.legs.map((leg, i) => {
        const side = i === 0 ? 1 : -1;
        return (
          <group key={i}>
            <mesh geometry={leg} material={materials.skin} castShadow />
            {[-0.06, 0.06].map((offset) => (
              <mesh key={offset} position={[0.54 * side + offset * 1.3, 0.0, 0.52]} rotation={[Math.PI / 2, 0, 0]} material={materials.claw}>
                <coneGeometry args={[0.06, 0.16, 10]} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Shadow Ball (hidden until the action) */}
      <group ref={ball} position={BALL_START.toArray()} scale={0.001}>
        <mesh ref={ballCore} material={materials.ballCore}>
          <sphereGeometry args={[0.7, 24, 18]} />
        </mesh>
        <mesh ref={ballGlow} material={materials.ballGlow} scale={1.35}>
          <sphereGeometry args={[0.7, 24, 18]} />
        </mesh>
        <pointLight ref={ballLight} color="#9d6bff" intensity={0} distance={5} decay={2} />
      </group>

      {/* Eerie purple glow and shadow wisps */}
      <pointLight color="#7c4dff" intensity={0.8} distance={3.5} decay={2} position={[0, -0.2, 1.5]} />
      <points ref={wisps} geometry={assets.wispGeometry} material={materials.wisps} frustumCulled={false} />
    </group>
  );
}
