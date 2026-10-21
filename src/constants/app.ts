export const APP_NAME = "Pokémon Nexus";

export const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2";

export const SPRITES_BASE_URL =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

/** Cards per page in the Pokédex explorer. */
export const PAGE_SIZE = 24;

/**
 * Detail pages prerendered at build time. Kept small so builds make few PokéAPI
 * requests; every other Pokémon gets an instant shell, renders on first visit
 * and is then cached.
 */
export const PRERENDERED_POKEMON_COUNT = 24;

/** Curated Pokémon shown on the home page (National Pokédex numbers). */
export const FEATURED_POKEMON_IDS = [6, 25, 133, 448, 658, 94] as const;

/** The hero Pokémon on the home page (shown as a fan-made 3D model, see features/home/hero-pikachu). */
export const HERO_POKEMON_ID = 25;

/** Highest base stat value in the main series (Blissey's HP); used to scale stat bars. */
export const MAX_BASE_STAT = 255;

export const STORAGE_KEYS = {
  favorites: "nexus:favorites:v1",
  theme: "nexus:theme",
  threeD: "nexus:3d",
} as const;
