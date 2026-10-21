import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { EvolutionNode } from "@/types/pokemon";
import { countEvolutionNodes } from "@/lib/api/transform";
import { officialArtworkUrl } from "@/lib/utils/artwork";
import { cn } from "@/lib/utils/cn";
import { formatDexNumber } from "@/lib/utils/format";
import { PokemonImage } from "@/components/pokemon/pokemon-image";

interface EvolutionChainProps {
  chain: EvolutionNode | null;
  currentId: number;
}

function Stage({ node, currentId }: { node: EvolutionNode; currentId: number }) {
  const current = node.speciesId === currentId;
  return (
    <Link
      href={`/pokemon/${node.slug}`}
      aria-current={current ? "page" : undefined}
      className={cn(
        "group flex w-36 shrink-0 flex-col items-center rounded-xl border p-3 text-center transition-[border-color,background-color] duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        current ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover",
      )}
    >
      <div className="relative size-20">
        <PokemonImage src={officialArtworkUrl(node.speciesId)} alt={node.name} sizes="80px" />
      </div>
      <span className="mt-2 font-mono text-[0.6875rem] tabular-nums text-subtle">{formatDexNumber(node.speciesId)}</span>
      <span className="font-display text-sm font-semibold text-text">{node.name}</span>
    </Link>
  );
}

function Branch({ node, currentId }: { node: EvolutionNode; currentId: number }) {
  return (
    <li className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      <Stage node={node} currentId={currentId} />
      {node.evolvesTo.length > 0 && (
        <ul className="flex flex-col gap-3 border-l border-dashed border-border-strong pl-4 sm:border-l-0 sm:pl-0">
          {node.evolvesTo.map((child) => (
            <li key={child.speciesId} className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-xs text-muted sm:w-40 sm:flex-col sm:gap-1 sm:text-center">
                <ChevronRight className="size-4 shrink-0 rotate-90 text-accent sm:rotate-0" aria-hidden="true" />
                <span>
                  <span className="sr-only">Evolves into {child.name}: </span>
                  {child.conditions.length ? child.conditions.join(" · or ") : "Condition unavailable"}
                </span>
              </div>
              <ul>
                <Branch node={child} currentId={currentId} />
              </ul>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function EvolutionChain({ chain, currentId }: EvolutionChainProps) {
  if (!chain) {
    return <p className="text-muted">Evolution data is not available for this Pokémon.</p>;
  }
  if (countEvolutionNodes(chain) === 1) {
    return <p className="text-muted">{chain.name} does not evolve into or from any other Pokémon.</p>;
  }
  return (
    <div className="overflow-x-auto pb-2">
      <ul aria-label="Evolution chain" className="flex min-w-max">
        <Branch node={chain} currentId={currentId} />
      </ul>
    </div>
  );
}
