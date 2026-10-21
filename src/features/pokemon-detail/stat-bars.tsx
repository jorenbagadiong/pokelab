"use client";

import { useLayoutEffect, useRef } from "react";
import type { StatValue } from "@/types/pokemon";
import { MAX_BASE_STAT } from "@/constants/app";
import { grow } from "@/lib/animations";
import { statRatio } from "@/lib/api/transform";

function statTone(value: number): string {
  if (value >= 120) return "var(--accent)";
  if (value >= 90) return "#34d399";
  if (value >= 60) return "#fbbf24";
  return "#fb7185";
}

export function StatBars({ stats, total, color }: { stats: StatValue[]; total: number; color: string }) {
  const listRef = useRef<HTMLDListElement>(null);

  useLayoutEffect(() => {
    const root = listRef.current;
    if (!root) return;
    return grow(Array.from(root.querySelectorAll<HTMLElement>("[data-bar]")));
  }, [stats]);

  if (stats.length === 0) return <p className="text-muted">Base stats are not available.</p>;

  return (
    <div>
      <dl ref={listRef} className="space-y-3">
        {stats.map((stat) => {
          const ratio = statRatio(stat.value);
          return (
            <div key={stat.key} className="grid grid-cols-[5.5rem_2.75rem_1fr] items-center gap-3">
              <dt className="text-sm text-muted">{stat.label}</dt>
              <dd className="text-right font-mono text-sm font-semibold tabular-nums text-text">{stat.value}</dd>
              <dd aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-hover">
                <div className="h-full rounded-full" style={{ width: `${ratio * 100}%` }}>
                  <div
                    data-bar
                    data-grow
                    className="h-full origin-left rounded-full"
                    style={{ background: `linear-gradient(90deg, ${color}, ${statTone(stat.value)})` }}
                  />
                </div>
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted">Total</span>
        <span className="font-mono font-semibold tabular-nums text-text">{total}</span>
      </p>
      <p className="mt-1 text-xs text-subtle">Bars are scaled to {MAX_BASE_STAT}, the highest base stat in the series.</p>
    </div>
  );
}
