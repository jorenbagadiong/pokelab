/**
 * The 18 battle types that PokéAPI assigns to Pokémon. PokéAPI also lists
 * `stellar`, `unknown` and `shadow`, but no Pokémon currently carries them, so
 * they are excluded from filtering and exploration.
 */
export const POKEMON_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

export function isPokemonType(value: string): value is PokemonType {
  return (POKEMON_TYPES as readonly string[]).includes(value);
}

/**
 * Type palette. `text` is the badge foreground, chosen so each pair meets
 * WCAG AA (≥ 4.5:1) contrast against `color`.
 */
export const TYPE_PALETTE: Record<PokemonType, { color: string; text: string }> = {
  normal: { color: "#A8A77A", text: "#0B1220" },
  fire: { color: "#EE8130", text: "#0B1220" },
  water: { color: "#6390F0", text: "#0B1220" },
  electric: { color: "#F7D02C", text: "#0B1220" },
  grass: { color: "#7AC74C", text: "#0B1220" },
  ice: { color: "#96D9D6", text: "#0B1220" },
  fighting: { color: "#C22E28", text: "#FFFFFF" },
  poison: { color: "#A33EA1", text: "#FFFFFF" },
  ground: { color: "#E2BF65", text: "#0B1220" },
  flying: { color: "#A98FF3", text: "#0B1220" },
  psychic: { color: "#F95587", text: "#0B1220" },
  bug: { color: "#A6B91A", text: "#0B1220" },
  rock: { color: "#B6A136", text: "#0B1220" },
  ghost: { color: "#735797", text: "#FFFFFF" },
  dragon: { color: "#6F35FC", text: "#FFFFFF" },
  dark: { color: "#705746", text: "#FFFFFF" },
  steel: { color: "#B7B7CE", text: "#0B1220" },
  fairy: { color: "#D685AD", text: "#0B1220" },
};

/** Neutral fallback used when a Pokémon has no recognised type. */
export const FALLBACK_TYPE_COLOR = "#64748B";

export function typeColor(type: string | undefined): string {
  return type && isPokemonType(type) ? TYPE_PALETTE[type].color : FALLBACK_TYPE_COLOR;
}
