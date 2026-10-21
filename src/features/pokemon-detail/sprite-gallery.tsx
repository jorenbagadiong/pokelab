import type { SpriteImage } from "@/types/pokemon";
import { PokemonImage } from "@/components/pokemon/pokemon-image";

export function SpriteGallery({ sprites, name }: { sprites: SpriteImage[]; name: string }) {
  if (sprites.length === 0) return <p className="text-muted">No sprites are available for this Pokémon.</p>;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {sprites.map((sprite) => (
        <li key={sprite.url} className="rounded-xl border border-border bg-surface p-3">
          <div className="relative aspect-square">
            <PokemonImage
              src={sprite.url}
              alt={`${name} — ${sprite.label}`}
              pixelated={sprite.pixelated}
              sizes="(min-width: 640px) 25vw, 50vw"
              className={sprite.pixelated ? "p-2" : "p-1"}
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted">{sprite.label}</p>
        </li>
      ))}
    </ul>
  );
}
