"use client";

import { Suspense, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { slideIn } from "@/lib/animations";
import { NavLinks, NavLinksView } from "./nav-links";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useLayoutEffect(() => {
    if (open) return slideIn(panelRef.current);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <IconButton
        ref={buttonRef}
        label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={panelId}
        size="sm"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
      </IconButton>
      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="absolute inset-x-4 top-[calc(var(--header-height)+0.25rem)] rounded-xl border border-border bg-bg-elevated p-2 shadow-lg"
      >
        <nav aria-label="Mobile">
          <Suspense fallback={<NavLinksView pathname={null} orientation="vertical" onNavigate={close} />}>
            <NavLinks orientation="vertical" onNavigate={close} />
          </Suspense>
        </nav>
      </div>
    </div>
  );
}
