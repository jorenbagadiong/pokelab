/** Animation timing tokens (ms). Mirrored by the `--duration-*` CSS variables. */
export const DURATION = {
  fast: 200,
  base: 480,
  slow: 800,
} as const;

/** Anime.js v4 easing names. */
export const EASE = {
  out: "outQuart",
} as const;
