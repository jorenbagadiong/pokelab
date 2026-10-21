/**
 * Application-level Pokémon models. These are the transformed shapes the UI
 * consumes; raw PokéAPI shapes live in `src/lib/api/schemas.ts`.
 */

/** A lightweight entry in the National Pokédex index. */
export interface PokemonSummary {
  /** National Pokédex number. */
  id: number;
  /** Species slug, used for routing (e.g. `deoxys`, `mr-mime`). */
  slug: string;
  /** Display name derived from the slug (e.g. `Mr. Mime`). */
  name: string;
  /** Types in slot order. */
  types: string[];
}

export interface StatValue {
  key: string;
  label: string;
  value: number;
}

export interface AbilityInfo {
  slug: string;
  name: string;
  isHidden: boolean;
  /** Short English effect, when PokéAPI provides one. */
  effect: string | null;
}

export interface SpriteImage {
  label: string;
  url: string;
  /** Pixel sprites should not be smoothed or optimised. */
  pixelated: boolean;
}

export interface MoveInfo {
  slug: string;
  name: string;
  level: number;
  type: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damageClass: string | null;
}

export interface EvolutionNode {
  speciesId: number;
  slug: string;
  name: string;
  /** Human-readable conditions for evolving into this stage. Empty for the base stage. */
  conditions: string[];
  evolvesTo: EvolutionNode[];
}

export interface PokemonDetail {
  id: number;
  /** PokéAPI `pokemon` resource name (may include a form suffix, e.g. `deoxys-normal`). */
  pokemonName: string;
  slug: string;
  name: string;
  genus: string | null;
  types: string[];
  /** Metres. */
  heightM: number;
  /** Kilograms. */
  weightKg: number;
  baseExperience: number | null;
  abilities: AbilityInfo[];
  stats: StatValue[];
  statTotal: number;
  artwork: string | null;
  shinyArtwork: string | null;
  sprites: SpriteImage[];
  flavorText: string | null;
  flavorVersion: string | null;
  games: string[];
  generation: string | null;
  habitat: string | null;
  captureRate: number | null;
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  evolution: EvolutionNode | null;
  moveRefs: MoveRef[];
  totalMoves: number;
  versionGroup: string | null;
}

/** A move reference before details are fetched. */
export interface MoveRef {
  slug: string;
  level: number;
}
