import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { PokemonSummary } from "@/types/pokemon";
import { formatDexNumber } from "@/lib/utils/format";

function NavCard({ pokemon, direction }: { pokemon: PokemonSummary; direction: "prev" | "next" }) {
  const Icon = direction === "prev" ? ArrowLeft : ArrowRight;
  return (
    <Link
      href={`/pokemon/${pokemon.slug}`}
      rel={direction}
      className={`group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors duration-200 hover:border-border-strong hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${direction === "next" ? "flex-row-reverse text-right" : ""}`}
    >
      <Icon
        className={`size-4 shrink-0 text-muted transition-transform duration-200 ${direction === "prev" ? "group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5"}`}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="block text-xs text-subtle">{direction === "prev" ? "Previous" : "Next"}</span>
        <span className="block truncate font-display font-semibold text-text">
          <span className="font-mono text-xs font-normal text-subtle">{formatDexNumber(pokemon.id)}</span> {pokemon.name}
        </span>
      </span>
    </Link>
  );
}

export function PrevNextNav({ prev, next }: { prev: PokemonSummary | null; next: PokemonSummary | null }) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="Adjacent Pokémon" className="flex gap-3">
      {prev ? <NavCard pokemon={prev} direction="prev" /> : <span className="flex-1" />}
      {next ? <NavCard pokemon={next} direction="next" /> : <span className="flex-1" />}
    </nav>
  );
}
