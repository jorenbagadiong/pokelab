import type { MoveRef } from "@/types/pokemon";
import { getMoveInfos } from "@/lib/api/pokeapi";
import { titleCase } from "@/lib/utils/format";
import { TypeBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const dash = <span className="text-subtle">—</span>;

export async function MovesTable({
  refs,
  versionGroup,
  totalMoves,
}: {
  refs: MoveRef[];
  versionGroup: string | null;
  totalMoves: number;
}) {
  if (refs.length === 0) {
    return <p className="text-muted">No level-up move data is available for this Pokémon.</p>;
  }

  const moves = await getMoveInfos(refs);

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        First {moves.length} level-up moves in <span className="text-text">{versionGroup ? titleCase(versionGroup) : "the latest games"}</span>
        {" · "}learns {totalMoves} moves in total across all methods and games.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <caption className="sr-only">Selected level-up moves</caption>
          <thead className="bg-surface-hover text-xs uppercase tracking-wide text-subtle">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Lv.</th>
              <th scope="col" className="px-4 py-3 font-semibold">Move</th>
              <th scope="col" className="px-4 py-3 font-semibold">Type</th>
              <th scope="col" className="px-4 py-3 font-semibold">Class</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Power</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Acc.</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">PP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {moves.map((move) => (
              <tr key={move.slug} className="transition-colors hover:bg-surface-hover">
                <td className="px-4 py-3 font-mono tabular-nums text-muted">{move.level > 0 ? move.level : "—"}</td>
                <th scope="row" className="px-4 py-3 font-medium text-text">{move.name}</th>
                <td className="px-4 py-3">{move.type ? <TypeBadge type={move.type} /> : dash}</td>
                <td className="px-4 py-3 text-muted">{move.damageClass ? titleCase(move.damageClass) : dash}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{move.power ?? dash}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{move.accuracy !== null ? `${move.accuracy}%` : dash}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{move.pp ?? dash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-subtle">“—” means PokéAPI has no value (e.g. status moves have no power).</p>
    </div>
  );
}

export function MovesSkeleton() {
  return (
    <div role="status" aria-label="Loading moves" className="space-y-2">
      <Skeleton className="mb-4 h-4 w-72" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}
