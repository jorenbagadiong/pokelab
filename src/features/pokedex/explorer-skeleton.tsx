import { PokemonCardSkeleton } from "@/components/pokemon/pokemon-card";
import { Skeleton } from "@/components/ui/skeleton";

export function ExplorerSkeleton({ cards = 12 }: { cards?: number }) {
  return (
    <div role="status" aria-label="Loading Pokédex">
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface p-3 sm:gap-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_12rem_13rem_10rem]">
        <Skeleton className="col-span-2 h-11 rounded-full md:col-span-1" />
        <Skeleton className="h-11 rounded-full" />
        <Skeleton className="h-11 rounded-full" />
        <Skeleton className="col-span-2 h-11 rounded-full md:col-span-1" />
      </div>
      <Skeleton className="mb-4 h-4 w-48" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: cards }, (_, i) => (
          <PokemonCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
