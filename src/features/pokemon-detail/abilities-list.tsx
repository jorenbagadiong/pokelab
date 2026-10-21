import { EyeOff } from "lucide-react";
import type { AbilityInfo } from "@/types/pokemon";

export function AbilitiesList({ abilities }: { abilities: AbilityInfo[] }) {
  if (abilities.length === 0) return <p className="text-muted">No abilities are listed for this Pokémon.</p>;

  return (
    <ul className="space-y-3">
      {abilities.map((ability) => (
        <li key={ability.slug} className="rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display font-semibold text-text">{ability.name}</h4>
            {ability.isHidden && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-2-soft px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-accent-2">
                <EyeOff className="size-3" aria-hidden="true" />
                Hidden ability
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted">{ability.effect ?? "No description available."}</p>
        </li>
      ))}
    </ul>
  );
}
