import { cacheLife, cacheTag } from "next/cache";
import { POKEMON_TYPES } from "@/constants/types";
import type { MoveInfo, MoveRef, PokemonDetail, PokemonSummary } from "@/types/pokemon";
import { fetchJson } from "./client";
import { NotFoundError } from "./errors";
import {
  parseAbility,
  parseEvolutionChain,
  parseMove,
  parsePokemon,
  parseResourceList,
  parseSpecies,
  parseTypeMembers,
  type RawAbility,
  type RawEvolutionLink,
  type RawMove,
  type RawPokemon,
  type RawSpecies,
} from "./schemas";
import { buildPokedexIndex, resolvePokemonParam, toMoveInfo, toPokemonDetail } from "./transform";

/*
 * Server-side PokéAPI access.
 *
 * Leaf fetchers are cached with `'use cache'`, which also deduplicates
 * concurrent identical calls. They return `null` only for a definitive 404 and
 * throw on network or server errors, so transient failures are never cached.
 * Optional data (abilities, moves, species, evolution) degrades gracefully in
 * the uncached composition functions below.
 */

const LIST_LIMIT = 2000;

async function nullOn404<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

async function settle<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    console.error("[pokeapi] optional resource failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

/* ---------- Cached leaf fetchers ---------- */

export async function getSpeciesList() {
  "use cache";
  cacheLife("days");
  cacheTag("pokeapi", "pokeapi:index");
  return parseResourceList(await fetchJson(`/pokemon-species?limit=${LIST_LIMIT}`));
}

/** Default `pokemon` resource names keyed by id, e.g. `[386, "deoxys-normal"]`. */
export async function getPokemonNameEntries(): Promise<[number, string][]> {
  "use cache";
  cacheLife("days");
  cacheTag("pokeapi", "pokeapi:index");
  return parseResourceList(await fetchJson(`/pokemon?limit=${LIST_LIMIT}`)).map((e) => [e.id, e.name]);
}

export async function getTypeMembers(type: string) {
  "use cache";
  cacheLife("days");
  cacheTag("pokeapi", "pokeapi:index");
  return parseTypeMembers(await fetchJson(`/type/${encodeURIComponent(type)}`));
}

export async function getPokedexIndex(): Promise<PokemonSummary[]> {
  "use cache";
  cacheLife("days");
  cacheTag("pokeapi", "pokeapi:index");
  const [species, ...types] = await Promise.all([getSpeciesList(), ...POKEMON_TYPES.map((t) => getTypeMembers(t))]);
  return buildPokedexIndex(species, types);
}

export async function getPokemon(id: number): Promise<RawPokemon | null> {
  "use cache";
  cacheLife("days");
  cacheTag("pokeapi", `pokeapi:pokemon:${id}`);
  return nullOn404(fetchJson(`/pokemon/${id}`).then(parsePokemon));
}

export async function getSpecies(id: number): Promise<RawSpecies | null> {
  "use cache";
  cacheLife("days");
  cacheTag("pokeapi", `pokeapi:species:${id}`);
  return nullOn404(fetchJson(`/pokemon-species/${id}`).then(parseSpecies));
}

export async function getEvolutionChain(id: number): Promise<RawEvolutionLink | null> {
  "use cache";
  cacheLife("days");
  cacheTag("pokeapi");
  return nullOn404(fetchJson(`/evolution-chain/${id}`).then(parseEvolutionChain));
}

export async function getAbility(name: string): Promise<RawAbility | null> {
  "use cache";
  cacheLife("days");
  cacheTag("pokeapi");
  return nullOn404(fetchJson(`/ability/${encodeURIComponent(name)}`).then(parseAbility));
}

export async function getMove(name: string): Promise<RawMove | null> {
  "use cache";
  cacheLife("days");
  cacheTag("pokeapi");
  return nullOn404(fetchJson(`/move/${encodeURIComponent(name)}`).then(parseMove));
}

/* ---------- Composition (uncached; built only from cached leaves) ---------- */

const PARAM_PATTERN = /^[a-z0-9-]{1,48}$/;

/** Resolves a route param to its index entry, or `null` if it is not a National Pokédex Pokémon. */
export async function findPokemon(param: string): Promise<PokemonSummary | null> {
  let value: string;
  try {
    value = decodeURIComponent(param).trim().toLowerCase();
  } catch {
    return null;
  }
  if (!PARAM_PATTERN.test(value)) return null;

  const index = await getPokedexIndex();
  const direct = resolvePokemonParam(value, index);
  if (direct) return direct;
  // Accept default form names such as `deoxys-normal` as aliases.
  const names = new Map(await getPokemonNameEntries());
  return resolvePokemonParam(value, index, names);
}

export async function getPokemonDetail(id: number): Promise<PokemonDetail | null> {
  const [pokemon, species] = await Promise.all([getPokemon(id), settle(getSpecies(id))]);
  if (!pokemon) return null;

  const [evolution, abilities] = await Promise.all([
    species?.evolutionChainId ? settle(getEvolutionChain(species.evolutionChainId)) : Promise.resolve(null),
    Promise.all(pokemon.abilities.map((a) => settle(getAbility(a.name)))),
  ]);

  return toPokemonDetail({ pokemon, species, evolution, abilities });
}

export async function getMoveInfos(refs: MoveRef[]): Promise<MoveInfo[]> {
  const details = await Promise.all(refs.map((ref) => settle(getMove(ref.slug))));
  return refs.map((ref, i) => toMoveInfo(ref, details[i] ?? null));
}

export interface FeaturedPokemon extends PokemonSummary {
  artwork: string | null;
  genus: string | null;
  flavorText: string | null;
  statTotal: number;
}

/** Featured cards for the home page. Entries that fail to load are omitted. */
export async function getFeaturedPokemon(ids: readonly number[]): Promise<FeaturedPokemon[]> {
  const results = await Promise.all(ids.map((id) => settle(getPokemonDetail(id))));
  return results.flatMap((detail) =>
    detail
      ? [
          {
            id: detail.id,
            slug: detail.slug,
            name: detail.name,
            types: detail.types,
            artwork: detail.artwork,
            genus: detail.genus,
            flavorText: detail.flavorText,
            statTotal: detail.statTotal,
          },
        ]
      : [],
  );
}
