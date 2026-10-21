"use client";

import type { MouseEvent, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePressFeedback } from "@/hooks/use-press-feedback";
import { cn } from "@/lib/utils/cn";
import { pageWindow, serializeQuery, type PokedexQuery } from "./query";

interface PaginationProps {
  page: number;
  pageCount: number;
  query: PokedexQuery;
  onPageChange: (page: number) => void;
}

const itemBase =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-medium tabular-nums transition-colors duration-200 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export function Pagination({ page, pageCount, query, onPageChange }: PaginationProps) {
  const onPress = usePressFeedback();
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const search = serializeQuery({ ...query, page: target });
    return search ? `?${search}` : "?";
  };

  // Real links keep "open in new tab" working; plain clicks update state without a server round-trip.
  const handle = (target: number) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onPageChange(target);
  };

  const edge = (target: number, disabled: boolean, label: string, children: ReactNode) =>
    disabled ? (
      <span aria-disabled="true" className={cn(itemBase, "cursor-not-allowed text-subtle opacity-50")}>
        {children}
        <span className="sr-only">{label}</span>
      </span>
    ) : (
      <a href={href(target)} onClick={handle(target)} onPointerDown={onPress} className={cn(itemBase, "text-muted hover:bg-surface-hover hover:text-text")}>
        {children}
        <span className="sr-only">{label}</span>
      </a>
    );

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
      {edge(page - 1, page <= 1, "Previous page", <ChevronLeft className="size-4" aria-hidden="true" />)}
      <ul className="flex items-center gap-1">
        {pageWindow(page, pageCount).map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-subtle">
              …
            </li>
          ) : (
            <li key={p}>
              <a
                href={href(p)}
                onClick={handle(p)}
                onPointerDown={onPress}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Page ${p}`}
                className={cn(
                  itemBase,
                  p === page ? "bg-accent text-accent-contrast" : "text-muted hover:bg-surface-hover hover:text-text",
                )}
              >
                {p}
              </a>
            </li>
          ),
        )}
      </ul>
      {edge(page + 1, page >= pageCount, "Next page", <ChevronRight className="size-4" aria-hidden="true" />)}
    </nav>
  );
}
