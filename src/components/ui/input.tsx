import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const field =
  "h-11 w-full rounded-full border border-border-strong bg-surface-strong text-sm text-text placeholder:text-subtle " +
  "transition-[border-color,box-shadow] duration-200 hover:border-accent/60 " +
  "focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 " +
  "disabled:cursor-not-allowed disabled:opacity-[var(--disabled-opacity)]";

type TextInputProps = ComponentPropsWithoutRef<"input"> & {
  icon?: ReactNode;
  /** Rendered inside the field on the right (e.g. a clear button). */
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function TextInput({ icon, trailing, className, ref, ...props }: TextInputProps) {
  return (
    <div className="relative w-full">
      {icon && (
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-subtle" aria-hidden="true">
          {icon}
        </span>
      )}
      <input ref={ref} className={cn(field, icon ? "pl-11" : "pl-4", trailing ? "pr-12" : "pr-4", className)} {...props} />
      {trailing && <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>}
    </div>
  );
}

type SelectProps = ComponentPropsWithoutRef<"select">;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select className={cn(field, "cursor-pointer appearance-none pl-4 pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle"
        aria-hidden="true"
      />
    </div>
  );
}
