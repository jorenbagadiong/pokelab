export const APP_NAME = "Pokémon Nexus";

export const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2";

export const SPRITES_BASE_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

/** Cards per page in the Pokédex explorer. */
export const PAGE_SIZE = 24;

/** National Pokédex entries prerendered at build time; the rest render on demand. */
export const PRERENDERED_POKEMON_COUNT = 151;

/** Curated Pokémon shown on the home page (National Pokédex numbers). */
export const FEATURED_POKEMON_IDS = [6, 25, 133, 448, 658, 94] as const;

/** The hero Pokémon on the home page. */
export const HERO_POKEMON_ID = 133;

/** Highest base stat value in the main series (Blissey's HP); used to scale stat bars. */
export const MAX_BASE_STAT = 255;

export const STORAGE_KEYS = {
  favorites: "nexus:favorites:v1",
  theme: "nexus:theme",
  threeD: "nexus:3d",
} as const;
