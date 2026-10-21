import { animate, stagger, utils } from "animejs";
import { DURATION, EASE } from "./tokens";

/*
 * DOM animation helpers built on Anime.js v4. Every helper:
 * - animates only `opacity` and `transform`;
 * - is a no-op (showing the final state) when the user prefers reduced motion;
 * - returns a cleanup that cancels the animation and leaves elements visible.
 *
 * Server-rendered elements can opt into a pre-hydration hidden state with the
 * `data-reveal` / `data-grow` attributes (see globals.css). The helpers remove
 * those attributes when they take over, and a CSS failsafe reveals them if
 * JavaScript never runs.
 */

export type Cleanup = () => void;
const noop: Cleanup = () => {};

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type AnimTarget = HTMLElement | SVGElement;

function release(el: AnimTarget, ...props: string[]) {
  for (const prop of props) el.style.removeProperty(prop);
  el.removeAttribute("data-reveal");
  el.removeAttribute("data-grow");
}

export interface RevealOptions {
  /** Delay between consecutive elements (ms). Kept short so long lists stay responsive. */
  step?: number;
  /** Cap on the total stagger, so large grids never wait long for their last item. */
  maxStagger?: number;
  delay?: number;
  distance?: number;
  duration?: number;
}

/** Fades and lifts elements into place with a short stagger. */
export function reveal(targets: HTMLElement[], options: RevealOptions = {}): Cleanup {
  if (targets.length === 0) return noop;
  const { step = 40, maxStagger = 360, delay = 0, distance = 14, duration = DURATION.base } = options;

  if (prefersReducedMotion()) {
    targets.forEach((el) => release(el, "opacity", "transform"));
    return noop;
  }

  const effectiveStep = targets.length > 1 ? Math.min(step, maxStagger / (targets.length - 1)) : 0;
  utils.set(targets, { opacity: 0, translateY: distance });
  targets.forEach((el) => {
    el.removeAttribute("data-reveal");
  });

  const animation = animate(targets, {
    opacity: 1,
    translateY: 0,
    duration,
    ease: EASE.out,
    delay: stagger(effectiveStep, { start: delay }),
    onComplete: () => targets.forEach((el) => release(el, "opacity", "transform")),
  });

  return () => {
    animation.cancel();
    targets.forEach((el) => release(el, "opacity", "transform"));
  };
}

/** Grows bars horizontally from their left edge (transform-origin must be left). */
export function grow(targets: HTMLElement[], options: { step?: number; delay?: number } = {}): Cleanup {
  if (targets.length === 0) return noop;
  const { step = 50, delay = 100 } = options;

  if (prefersReducedMotion()) {
    targets.forEach((el) => release(el, "transform"));
    return noop;
  }

  utils.set(targets, { scaleX: 0 });
  targets.forEach((el) => el.removeAttribute("data-grow"));

  const animation = animate(targets, {
    scaleX: 1,
    duration: DURATION.slow,
    ease: EASE.out,
    delay: stagger(step, { start: delay }),
    onComplete: () => targets.forEach((el) => release(el, "transform")),
  });

  return () => {
    animation.cancel();
    targets.forEach((el) => release(el, "transform"));
  };
}

/** A brief scale "pop" used as feedback for toggles such as favorites. */
export function pop(target: AnimTarget | null): Cleanup {
  if (!target || prefersReducedMotion()) return noop;
  const animation = animate(target, {
    scale: [
      { to: 1.3, duration: DURATION.fast * 0.8 },
      { to: 1, duration: DURATION.fast * 1.2 },
    ],
    ease: EASE.out,
    onComplete: () => release(target, "transform"),
  });
  return () => {
    animation.cancel();
    release(target, "transform");
  };
}

/** Subtle press feedback for buttons. Does not block the click. */
export function press(target: AnimTarget | null): Cleanup {
  if (!target || prefersReducedMotion()) return noop;
  const animation = animate(target, {
    scale: [
      { to: 0.94, duration: 80 },
      { to: 1, duration: 160 },
    ],
    ease: EASE.out,
    onComplete: () => release(target, "transform"),
  });
  return () => {
    animation.cancel();
    release(target, "transform");
  };
}

/** Slides a panel (e.g. the mobile menu) into view. */
export function slideIn(target: HTMLElement | null): Cleanup {
  if (!target || prefersReducedMotion()) return noop;
  utils.set(target, { opacity: 0, translateY: -8 });
  const animation = animate(target, {
    opacity: 1,
    translateY: 0,
    duration: DURATION.fast,
    ease: EASE.out,
    onComplete: () => release(target, "opacity", "transform"),
  });
  return () => {
    animation.cancel();
    release(target, "opacity", "transform");
  };
}

export interface TextRevealOptions {
  delay?: number;
  /** Delay between characters/words (ms); capped so long headings finish quickly. */
  step?: number;
  maxStagger?: number;
}

/** Hides split text units before an in-view reveal. */
export function hideText(targets: HTMLElement[]) {
  if (targets.length === 0 || prefersReducedMotion()) return;
  const distance = parseFloat(getComputedStyle(targets[0]).fontSize || "16") * 0.55;
  utils.set(targets, { opacity: 0, translateY: distance, rotate: 6 });
}

/** Rises split text (characters or words) into place with a short cascading stagger. */
export function revealText(targets: HTMLElement[], options: TextRevealOptions = {}): Cleanup {
  if (targets.length === 0) return noop;
  const { delay = 0, step = 22, maxStagger = 520 } = options;

  if (prefersReducedMotion()) {
    targets.forEach((el) => release(el, "opacity", "transform"));
    return noop;
  }

  const distance = parseFloat(getComputedStyle(targets[0]).fontSize || "16") * 0.55;
  const effectiveStep = targets.length > 1 ? Math.min(step, maxStagger / (targets.length - 1)) : 0;
  utils.set(targets, { opacity: 0, translateY: distance, rotate: 6 });
  targets.forEach((el) => el.removeAttribute("data-reveal"));

  const animation = animate(targets, {
    opacity: { to: 1, duration: DURATION.base * 0.8, ease: "outQuad" },
    translateY: { to: 0, duration: DURATION.slow, ease: "outExpo" },
    rotate: { to: 0, duration: DURATION.slow, ease: "outExpo" },
    delay: stagger(effectiveStep, { start: delay }),
    onComplete: () => targets.forEach((el) => release(el, "opacity", "transform")),
  });

  return () => {
    animation.cancel();
    targets.forEach((el) => release(el, "opacity", "transform"));
  };
}

/** A playful one-shot wave across characters, e.g. on hover. */
export function waveText(targets: HTMLElement[]): Cleanup {
  if (targets.length === 0 || prefersReducedMotion()) return noop;
  const animation = animate(targets, {
    translateY: [
      { to: -4, duration: 140, ease: "outQuad" },
      { to: 0, duration: 260, ease: "outBounce" },
    ],
    delay: stagger(28),
    onComplete: () => targets.forEach((el) => release(el, "transform")),
  });
  return () => {
    animation.cancel();
    targets.forEach((el) => release(el, "transform"));
  };
}
