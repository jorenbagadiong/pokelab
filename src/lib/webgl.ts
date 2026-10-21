let cached: boolean | null = null;

/** Detects WebGL support once per page load. Returns false on the server. */
export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    cached = context !== null;
    // Release the probe context immediately.
    (context as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

let acceleratedCache: boolean | null = null;

/**
 * True only when WebGL is hardware-accelerated. Browsers return no context for
 * `failIfMajorPerformanceCaveat` when they would fall back to software
 * rendering (e.g. SwiftShader), which would starve the main thread.
 */
export function isHardwareAcceleratedWebGL(): boolean {
  if (typeof window === "undefined") return false;
  if (acceleratedCache !== null) return acceleratedCache;
  try {
    const canvas = document.createElement("canvas");
    const options = { failIfMajorPerformanceCaveat: true };
    const context = (canvas.getContext("webgl2", options) ?? canvas.getContext("webgl", options)) as WebGLRenderingContext | null;
    acceleratedCache = context !== null && !isSoftwareRenderer(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    acceleratedCache = false;
  }
  return acceleratedCache;
}

const SOFTWARE_RENDERERS = /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i;

/** Some setups bypass the performance-caveat check, so also reject known software renderers by name. */
function isSoftwareRenderer(gl: WebGLRenderingContext): boolean {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return typeof renderer === "string" && SOFTWARE_RENDERERS.test(renderer);
}
