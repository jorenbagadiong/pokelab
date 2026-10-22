import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  MeshPhysicalMaterial,
  RepeatWrapping,
  Vector3,
  type Curve,
  type MeshPhysicalMaterialParameters,
} from "three";

/* Helpers for building organic shapes and textures in code. */

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};

/** Deterministic PRNG so generated geometry and textures are identical on every load. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Writes a per-vertex colour attribute computed from each vertex position (and normal, if present). */
export function paint(
  geometry: BufferGeometry,
  colorAt: (position: Vector3, normal: Vector3, out: Color) => void,
): BufferGeometry {
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const colors = new Float32Array(positions.count * 3);
  const p = new Vector3();
  const n = new Vector3();
  const c = new Color();
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i);
    if (normals) n.fromBufferAttribute(normals, i);
    else n.set(0, 0, 1);
    colorAt(p, n, c);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return geometry;
}

/**
 * A tube along `curve` whose radius varies with `radiusAt(t)` (t in [0, 1]),
 * with rounded end caps. Three's TubeGeometry only supports a constant radius.
 */
export function taperedTube(
  curve: Curve<Vector3>,
  radiusAt: (t: number) => number,
  tubularSegments = 48,
  radialSegments = 20,
): BufferGeometry {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const point = new Vector3();
  const normal = new Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, point);
    const r = Math.max(radiusAt(t), 1e-4);
    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);
      normal
        .set(0, 0, 0)
        .addScaledVector(frames.normals[i], cos)
        .addScaledVector(frames.binormals[i], sin)
        .normalize();
      positions.push(point.x + r * normal.x, point.y + r * normal.y, point.z + r * normal.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(i / tubularSegments, j / radialSegments);
    }
  }
  for (let i = 1; i <= tubularSegments; i++) {
    for (let j = 1; j <= radialSegments; j++) {
      const a = (radialSegments + 1) * (i - 1) + (j - 1);
      const b = (radialSegments + 1) * i + (j - 1);
      const c = (radialSegments + 1) * i + j;
      const d = (radialSegments + 1) * (i - 1) + j;
      indices.push(a, b, d, b, c, d);
    }
  }

  // Close each end with a fan so the tube reads as solid.
  const cap = (ring: number, t: number, flip: boolean) => {
    const center = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).multiplyScalar(flip ? -1 : 1);
    const centerIndex = positions.length / 3;
    positions.push(center.x, center.y, center.z);
    normals.push(tangent.x, tangent.y, tangent.z);
    uvs.push(t, 0.5);
    const start = ring * (radialSegments + 1);
    for (let j = 0; j < radialSegments; j++) {
      if (flip) indices.push(centerIndex, start + j + 1, start + j);
      else indices.push(centerIndex, start + j, start + j + 1);
    }
  };
  cap(0, 0, true);
  cap(tubularSegments, 1, false);

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  return geometry;
}

/** Converts a tiling height field into a tangent-space normal map texture. */
export function normalMapFromHeight(height: Float32Array, size: number, strength: number, repeat: [number, number]): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  const h = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
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
  texture.repeat.set(...repeat);
  return texture;
}

/** Rounded reptile-like scales: a tiling cellular (Worley) height field. */
export function createScaleNormalMap(seed = 3): CanvasTexture {
  const size = 256;
  const cells = 14; // cells per side; tiles seamlessly
  const rand = mulberry32(seed);
  const centers: [number, number][] = [];
  for (let gy = 0; gy < cells; gy++) {
    for (let gx = 0; gx < cells; gx++) centers.push([(gx + 0.2 + rand() * 0.6) / cells, (gy + 0.2 + rand() * 0.6) / cells]);
  }
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const gx = Math.floor(u * cells);
      const gy = Math.floor(v * cells);
      let best = Infinity;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          // Neighbouring cell, wrapped so the texture tiles; `wrapX/Y` shift its centre by a full tile.
          const nx = gx + ox;
          const ny = gy + oy;
          const wrapX = Math.floor(nx / cells);
          const wrapY = Math.floor(ny / cells);
          const [px, py] = centers[(ny - wrapY * cells) * cells + (nx - wrapX * cells)];
          best = Math.min(best, Math.hypot(px + wrapX - u, py + wrapY - v));
        }
      }
      // Domed scales: high in the middle, creased at the borders.
      const d = best * cells;
      height[y * size + x] = Math.max(0, 1 - d * d * 1.6);
    }
  }
  return normalMapFromHeight(height, size, 2.2, [6, 6]);
}

/** Soft round sprite for particles (fire, embers). */
export function createGlowTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.3, "rgba(255,255,255,0.75)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

/** Per-texel random strand heights, used as the alpha mask for fur shells. */
export function createStrandMask(seed = 21, repeat: [number, number] = [40, 24]): CanvasTexture {
  const size = 128;
  const rand = mulberry32(seed);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const value = Math.floor(rand() * 255);
    image.data.set([value, value, value, 255], i * 4);
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(...repeat);
  return texture;
}

/**
 * Shell-based fur: `count` materials, each meant for a copy of the base mesh.
 * Shell i is pushed out along the normal by `length * i / count` in the vertex
 * shader and keeps only strands taller than its height (via `alphaTest` on the
 * strand mask), so strands taper towards their tips. Lower shells are slightly
 * darker to fake self-shadowing between hairs. All shells share one program.
 */
export function createFurShellMaterials(
  count: number,
  length: number,
  base: MeshPhysicalMaterialParameters,
  strandMask: CanvasTexture,
): MeshPhysicalMaterial[] {
  return Array.from({ length: count }, (_, i) => {
    const f = (i + 1) / count;
    const material = new MeshPhysicalMaterial({
      ...base,
      alphaMap: strandMask,
      alphaTest: 0.12 + f * 0.78,
      color: new Color(base.color ?? "#ffffff").multiplyScalar(0.78 + 0.22 * f),
    });
    const offset = f * length;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uShellOffset = { value: offset };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uShellOffset;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normalize(objectNormal) * uShellOffset;");
    };
    material.customProgramCacheKey = () => "fur-shell";
    return material;
  });
}

/** A smooth lathe silhouette with helpers to place things exactly on its surface. */
export interface LatheSurface {
  /** Sampled (radius, height) profile, ready for LatheGeometry. */
  points: { x: number; y: number }[];
  radiusAt: (y: number) => number;
  /** Point on the surface at height `y`, `angle` around the vertical axis (0 faces +z), pushed out by `offset`. */
  surfacePoint: (y: number, angle: number, offset?: number) => [number, number, number];
}

export function createLatheSurface(profile: [number, number][], sx: number, sz: number, samples = 120): LatheSurface {
  const curve = new CatmullRomCurve3(profile.map(([r, y]) => new Vector3(r, y, 0)), false, "centripetal");
  const points = curve.getPoints(samples).map((p) => ({ x: Math.max(0, p.x), y: p.y }));
  points[0].x = 0;
  points[points.length - 1].x = 0;
  const radiusAt = (y: number) => {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      if (y >= a.y && y <= b.y) return a.x + ((y - a.y) / Math.max(b.y - a.y, 1e-6)) * (b.x - a.x);
    }
    return 0;
  };
  const surfacePoint = (y: number, angle: number, offset = 0): [number, number, number] => {
    const r = radiusAt(y) + offset;
    return [Math.sin(angle) * r * sx, y, Math.cos(angle) * r * sz];
  };
  return { points, radiusAt, surfacePoint };
}

/**
 * Wraps a flat geometry (x = arc length across the face, y = height offset)
 * onto a lathe surface around height `y0`. Used for painted-on features such as
 * mouths and eyes. Render with a DoubleSide material.
 */
export function projectOntoSurface(geometry: BufferGeometry, surface: LatheSurface, y0: number, offset: number): BufferGeometry {
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const y = y0 + positions.getY(i);
    const [px, py, pz] = surface.surfacePoint(y, positions.getX(i) / Math.max(surface.radiusAt(y), 1e-4), offset);
    positions.setXYZ(i, px, py, pz);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** A thin tube following a polyline drawn in face coordinates (as in `projectOntoSurface`). */
export function surfaceTube(points: [number, number][], surface: LatheSurface, y0: number, offset: number, radius: number): BufferGeometry {
  const curve = new CatmullRomCurve3(
    points.map(([u, v]) => new Vector3(...surface.surfacePoint(y0 + v, u / Math.max(surface.radiusAt(y0 + v), 1e-4), offset))),
  );
  return taperedTube(curve, () => radius, Math.max(8, points.length * 6), 6);
}
