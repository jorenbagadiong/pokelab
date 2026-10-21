"use client";

import { useLayoutEffect, useRef, type ElementType } from "react";
import { hideText, revealText, type Cleanup } from "@/lib/animations";
import { cn } from "@/lib/utils/cn";

export type TextSegment = string | { text: string; className?: string };

interface AnimatedTextProps {
  /** Plain text, or segments when part of the text needs its own styling (e.g. a gradient). */
  text: TextSegment | TextSegment[];
  as?: ElementType;
  id?: string;
  className?: string;
  /** Animate each character (headlines) or each word (longer copy). */
  split?: "chars" | "words";
  /**
   * `mount`: plays on load; units are hidden before hydration (with a CSS failsafe).
   * `inView`: plays when first scrolled into view; content already on screen is left as is.
   */
  trigger?: "mount" | "inView";
  delay?: number;
}

function toSegments(text: AnimatedTextProps["text"]): { text: string; className?: string }[] {
  return (Array.isArray(text) ? text : [text]).map((s) => (typeof s === "string" ? { text: s } : s));
}

/**
 * Heading/text whose characters or words animate in with Anime.js.
 *
 * The split spans are rendered by React (not by a DOM splitter that mutates
 * React-owned nodes). Screen readers get the intact text; the animated copy
 * is `aria-hidden`. Words never break mid-word.
 */
export function AnimatedText({
  text,
  as: Tag = "span",
  id,
  className,
  split = "chars",
  trigger = "inView",
  delay = 0,
}: AnimatedTextProps) {
  const ref = useRef<HTMLElement>(null);
  const segments = toSegments(text);
  const fullText = segments.map((s) => s.text).join("");
  const preHide = trigger === "mount" ? true : undefined;

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const units = Array.from(root.querySelectorAll<HTMLElement>("[data-unit]"));

    if (trigger === "mount") return revealText(units, { delay });

    if (typeof IntersectionObserver === "undefined") return;
    const rect = root.getBoundingClientRect();
    // Already visible at hydration: animating now would flash content the user can see.
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    let cleanup: Cleanup | null = null;
    hideText(units);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        cleanup = revealText(units, { delay });
      },
      { threshold: 0.35 },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      if (cleanup) {
        cleanup();
      } else {
        units.forEach((el) => {
          el.style.removeProperty("opacity");
          el.style.removeProperty("transform");
        });
      }
    };
  }, [trigger, delay, fullText]);

  return (
    <Tag ref={ref} id={id} className={className}>
      <span className="sr-only">{fullText}</span>
      <span aria-hidden="true">
        {segments.map((segment, si) =>
          segment.text.split(/(\s+)/).map((word, wi) => {
            const key = `${si}-${wi}`;
            if (word === "") return null;
            if (/^\s+$/.test(word)) return <span key={key}> </span>;
            // Styled segments (e.g. gradient text) animate per word so the style applies to the moving element.
            if (split === "words" || segment.className) {
              return (
                <span key={key} data-unit data-reveal={preHide} className={cn("inline-block", segment.className)}>
                  {word}
                </span>
              );
            }
            return (
              <span key={key} className="inline-block whitespace-nowrap">
                {Array.from(word).map((char, ci) => (
                  <span key={ci} data-unit data-reveal={preHide} className="inline-block">
                    {char}
                  </span>
                ))}
              </span>
            );
          }),
        )}
      </span>
    </Tag>
  );
}
