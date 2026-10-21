import type { PokemonDetail, PokemonSummary } from "@/types/pokemon";
import { findPokemon, getPokedexIndex, getPokemonDetail } from "@/lib/api/pokeapi";

export type PokemonPageResult =
  | { kind: "not-found" }
  | { kind: "redirect"; to: string }
  | { kind: "ok"; detail: PokemonDetail; prev: PokemonSummary | null; next: PokemonSummary | null };

/**
 * Resolves a `/pokemon/[name]` param. Unknown names are not found; numeric ids
 * and form names (e.g. `133`, `deoxys-normal`) redirect to the species slug.
 */
export async function loadPokemonPage(name: string): Promise<PokemonPageResult> {
  const entry = await findPokemon(name);
  if (!entry) return { kind: "not-found" };
  if (name !== entry.slug) return { kind: "redirect", to: `/pokemon/${entry.slug}` };

  const [detail, index] = await Promise.all([getPokemonDetail(entry.id), getPokedexIndex()]);
  if (!detail) return { kind: "not-found" };

  const position = index.findIndex((p) => p.id === entry.id);
  return {
    kind: "ok",
    detail,
    prev: position > 0 ? index[position - 1] : null,
    next: position >= 0 && position < index.length - 1 ? index[position + 1] : null,
  };
}
