import Link from "next/link";
import type { ComponentProps, ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium " +
  "transition-[background-color,border-color,color,box-shadow,translate] duration-200 ease-out-quart " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-[var(--disabled-opacity)] " +
  "aria-disabled:pointer-events-none aria-disabled:opacity-[var(--disabled-opacity)]";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-contrast shadow-glow hover:bg-accent-strong",
  secondary: "border border-border-strong bg-surface text-text hover:border-accent hover:bg-surface-hover",
  ghost: "text-muted hover:bg-surface-hover hover:text-text",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

type IconButtonProps = ComponentProps<"button"> & { label: string; size?: "sm" | "md" };

/** Square icon-only button. `label` is required and becomes the accessible name. */
export function IconButton({ label, size = "md", className, type = "button", children, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted",
        "transition-[background-color,border-color,color] duration-200 hover:border-border-strong hover:bg-surface-hover hover:text-text",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        "disabled:pointer-events-none disabled:opacity-[var(--disabled-opacity)]",
        size === "sm" ? "size-9" : "size-11",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
