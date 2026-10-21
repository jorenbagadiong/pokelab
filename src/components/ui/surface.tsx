import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { AnimatedText } from "./animated-text";

type SurfaceProps<T extends ElementType> = {
  as?: T;
  children?: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/** Glass-like content surface. Use for cards and panels. */
export function Surface<T extends ElementType = "div">({ as, className, children, ...props }: SurfaceProps<T>) {
  const Component = (as ?? "div") as ElementType;
  return (
    <Component
      className={cn("rounded-xl border border-border bg-surface shadow-sm backdrop-blur-sm", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  id?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>}
        <AnimatedText as="h2" id={id} text={title} className="font-display text-2xl font-semibold tracking-tight text-text sm:text-3xl" />
        {description && <p className="mt-2 text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
