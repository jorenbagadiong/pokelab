import {
  arr,
  englishEntry,
  idFromUrl,
  isRecord,
  named,
  nameOf,
  num,
  obj,
  optArr,
  optBool,
  optNamed,
  optNum,
  optObj,
  optStr,
  str,
  type NamedResource,
} from "./parse";
import { ApiParseError } from "./errors";

/* Raw shapes: only the PokéAPI fields this app consumes. */

export interface RawListEntry {
  id: number;
  name: string;
}

export interface RawTypeMembers {
  name: string;
  pokemon: { name: string; id: number; slot: number }[];
}

export interface RawPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  baseExperience: number | null;
  speciesName: string;
  types: { slot: number; name: string }[];
  abilities: { name: string; isHidden: boolean; slot: number }[];
  stats: { name: string; value: number }[];
  sprites: {
    frontDefault: string | null;
    backDefault: string | null;
    frontShiny: string | null;
    backShiny: string | null;
    officialArtwork: string | null;
    officialArtworkShiny: string | null;
    home: string | null;
    homeShiny: string | null;
  };
  gameVersions: string[];
  moves: {
    name: string;
    details: { level: number; method: string; versionGroup: string; versionGroupId: number | null }[];
  }[];
}

export interface RawSpecies {
  id: number;
  name: string;
  englishName: string | null;
  genus: string | null;
  flavorTexts: { text: string; version: string }[];
  evolutionChainId: number | null;
  generation: string | null;
  habitat: string | null;
  captureRate: number | null;
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
}

export interface RawEvolutionDetail {
  trigger: string | null;
  minLevel: number | null;
  item: string | null;
  heldItem: string | null;
  minHappiness: number | null;
  minAffection: number | null;
  minBeauty: number | null;
  timeOfDay: string | null;
  knownMove: string | null;
  knownMoveType: string | null;
  location: string | null;
  gender: number | null;
  needsOverworldRain: boolean;
  turnUpsideDown: boolean;
  tradeSpecies: string | null;
  partySpecies: string | null;
  partyType: string | null;
  relativePhysicalStats: number | null;
  isDefault: boolean;
}

export interface RawEvolutionLink {
  speciesName: string;
  speciesId: number;
  details: RawEvolutionDetail[];
  evolvesTo: RawEvolutionLink[];
}

export interface RawAbility {
  name: string;
  englishName: string | null;
  shortEffect: string | null;
  flavorText: string | null;
}

export interface RawMove {
  name: string;
  englishName: string | null;
  type: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  damageClass: string | null;
}

function idOrThrow(resource: NamedResource, path: string): number {
  const id = idFromUrl(resource.url);
  if (id === null) throw new ApiParseError(`${path}.url`, "resource URL ending in an id");
  return id;
}

/** `/pokemon?limit=…` and `/pokemon-species?limit=…` list responses. */
export function parseResourceList(data: unknown): RawListEntry[] {
  const root = obj(data, "list");
  return arr(root.results, "list.results").map((entry, i) => {
    const resource = named(entry, `list.results[${i}]`);
    return { id: idOrThrow(resource, `list.results[${i}]`), name: resource.name };
  });
}

/** `/type/{name}`: the Pokémon that currently have this type, with their slot. */
export function parseTypeMembers(data: unknown): RawTypeMembers {
  const root = obj(data, "type");
  const name = str(root.name, "type.name");
  const pokemon = optArr(root.pokemon).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const resource = optNamed(entry.pokemon);
    const slot = optNum(entry.slot);
    const id = resource ? idFromUrl(resource.url) : null;
    return resource && id !== null && slot !== null ? [{ name: resource.name, id, slot }] : [];
  });
  return { name, pokemon };
}

function sprite(source: Record<string, unknown> | null, key: string): string | null {
  return source ? optStr(source[key]) : null;
}

/** `/pokemon/{id-or-name}`. */
export function parsePokemon(data: unknown): RawPokemon {
  const root = obj(data, "pokemon");
  const sprites = optObj(root.sprites);
  const other = optObj(sprites?.other);
  const official = optObj(other?.["official-artwork"]);
  const home = optObj(other?.home);

  return {
    id: num(root.id, "pokemon.id"),
    name: str(root.name, "pokemon.name"),
    height: num(root.height, "pokemon.height"),
    weight: num(root.weight, "pokemon.weight"),
    baseExperience: optNum(root.base_experience),
    speciesName: named(root.species, "pokemon.species").name,
    types: arr(root.types, "pokemon.types")
      .map((entry, i) => {
        const o = obj(entry, `pokemon.types[${i}]`);
        return { slot: num(o.slot, `pokemon.types[${i}].slot`), name: named(o.type, `pokemon.types[${i}].type`).name };
      })
      .sort((a, b) => a.slot - b.slot),
    abilities: optArr(root.abilities)
      .flatMap((entry) => {
        if (!isRecord(entry)) return [];
        const ability = nameOf(entry.ability);
        return ability ? [{ name: ability, isHidden: optBool(entry.is_hidden), slot: optNum(entry.slot) ?? 99 }] : [];
      })
      .sort((a, b) => a.slot - b.slot),
    stats: arr(root.stats, "pokemon.stats").map((entry, i) => {
      const o = obj(entry, `pokemon.stats[${i}]`);
      return { name: named(o.stat, `pokemon.stats[${i}].stat`).name, value: num(o.base_stat, `pokemon.stats[${i}].base_stat`) };
    }),
    sprites: {
      frontDefault: sprite(sprites, "front_default"),
      backDefault: sprite(sprites, "back_default"),
      frontShiny: sprite(sprites, "front_shiny"),
      backShiny: sprite(sprites, "back_shiny"),
      officialArtwork: sprite(official, "front_default"),
      officialArtworkShiny: sprite(official, "front_shiny"),
      home: sprite(home, "front_default"),
      homeShiny: sprite(home, "front_shiny"),
    },
    gameVersions: optArr(root.game_indices).flatMap((entry) => {
      const version = isRecord(entry) ? nameOf(entry.version) : null;
      return version ? [version] : [];
    }),
    moves: optArr(root.moves).flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const move = nameOf(entry.move);
      if (!move) return [];
      const details = optArr(entry.version_group_details).flatMap((detail) => {
        if (!isRecord(detail)) return [];
        const method = nameOf(detail.move_learn_method);
        const group = optNamed(detail.version_group);
        if (!method || !group) return [];
        return [
          {
            level: optNum(detail.level_learned_at) ?? 0,
            method,
            versionGroup: group.name,
            versionGroupId: idFromUrl(group.url),
          },
        ];
      });
      return [{ name: move, details }];
    }),
  };
}

/** `/pokemon-species/{id-or-name}`. */
export function parseSpecies(data: unknown): RawSpecies {
  const root = obj(data, "species");
  // `evolution_chain` is an `APIResource` ({ url }) and may be null.
  const chainUrl = isRecord(root.evolution_chain) ? optStr(root.evolution_chain.url) : null;

  return {
    id: num(root.id, "species.id"),
    name: str(root.name, "species.name"),
    englishName: englishEntry(root.names, "name"),
    genus: englishEntry(root.genera, "genus"),
    flavorTexts: optArr(root.flavor_text_entries).flatMap((entry) => {
      if (!isRecord(entry) || nameOf(entry.language) !== "en") return [];
      const text = optStr(entry.flavor_text);
      return text ? [{ text, version: nameOf(entry.version) ?? "" }] : [];
    }),
    evolutionChainId: chainUrl ? idFromUrl(chainUrl) : null,
    generation: nameOf(root.generation),
    habitat: nameOf(root.habitat),
    captureRate: optNum(root.capture_rate),
    isLegendary: optBool(root.is_legendary),
    isMythical: optBool(root.is_mythical),
    isBaby: optBool(root.is_baby),
  };
}

function parseEvolutionDetail(value: unknown): RawEvolutionDetail | null {
  if (!isRecord(value)) return null;
  return {
    trigger: nameOf(value.trigger),
    minLevel: optNum(value.min_level),
    item: nameOf(value.item),
    heldItem: nameOf(value.held_item),
    minHappiness: optNum(value.min_happiness),
    minAffection: optNum(value.min_affection),
    minBeauty: optNum(value.min_beauty),
    timeOfDay: optStr(value.time_of_day),
    knownMove: nameOf(value.known_move),
    knownMoveType: nameOf(value.known_move_type),
    location: nameOf(value.location),
    gender: optNum(value.gender),
    needsOverworldRain: optBool(value.needs_overworld_rain),
    turnUpsideDown: optBool(value.turn_upside_down),
    tradeSpecies: nameOf(value.trade_species),
    partySpecies: nameOf(value.party_species),
    partyType: nameOf(value.party_type),
    relativePhysicalStats: optNum(value.relative_physical_stats),
    // Older responses omit `is_default`; treat those details as canonical.
    isDefault: value.is_default === undefined ? true : optBool(value.is_default),
  };
}

function parseEvolutionLink(value: unknown, path: string, depth: number): RawEvolutionLink {
  if (depth > 10) throw new ApiParseError(path, "evolution chain of reasonable depth");
  const link = obj(value, path);
  const species = named(link.species, `${path}.species`);
  return {
    speciesName: species.name,
    speciesId: idOrThrow(species, `${path}.species`),
    details: optArr(link.evolution_details).flatMap((d) => {
      const parsed = parseEvolutionDetail(d);
      return parsed ? [parsed] : [];
    }),
    evolvesTo: optArr(link.evolves_to).map((child, i) => parseEvolutionLink(child, `${path}.evolves_to[${i}]`, depth + 1)),
  };
}

/** `/evolution-chain/{id}`. */
export function parseEvolutionChain(data: unknown): RawEvolutionLink {
  const root = obj(data, "evolution-chain");
  return parseEvolutionLink(root.chain, "evolution-chain.chain", 0);
}

/** `/ability/{id-or-name}`. */
export function parseAbility(data: unknown): RawAbility {
  const root = obj(data, "ability");
  let flavorText: string | null = null;
  for (const entry of optArr(root.flavor_text_entries)) {
    if (isRecord(entry) && nameOf(entry.language) === "en") {
      flavorText = optStr(entry.flavor_text) ?? flavorText; // keep the latest English entry
    }
  }
  return {
    name: str(root.name, "ability.name"),
    englishName: englishEntry(root.names, "name"),
    shortEffect: englishEntry(root.effect_entries, "short_effect"),
    flavorText,
  };
}

/** `/move/{id-or-name}`. */
export function parseMove(data: unknown): RawMove {
  const root = obj(data, "move");
  return {
    name: str(root.name, "move.name"),
    englishName: englishEntry(root.names, "name"),
    type: nameOf(root.type),
    power: optNum(root.power),
    accuracy: optNum(root.accuracy),
    pp: optNum(root.pp),
    damageClass: nameOf(root.damage_class),
  };
}
