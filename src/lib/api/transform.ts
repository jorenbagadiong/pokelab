import { MAX_BASE_STAT } from "@/constants/app";
import { isPokemonType } from "@/constants/types";
import type {
  AbilityInfo,
  EvolutionNode,
  MoveInfo,
  MoveRef,
  PokemonDetail,
  PokemonSummary,
  SpriteImage,
  StatValue,
} from "@/types/pokemon";
import {
  cleanFlavorText,
  decimetresToMetres,
  formatPokemonName,
  formatStatLabel,
  hectogramsToKilograms,
  titleCase,
} from "@/lib/utils/format";
import { pickImage } from "@/lib/utils/artwork";
import type {
  RawAbility,
  RawEvolutionDetail,
  RawEvolutionLink,
  RawListEntry,
  RawMove,
  RawPokemon,
  RawSpecies,
  RawTypeMembers,
} from "./schemas";

/** National Pokédex species have ids below this; alternate forms start at 10001. */
const FORM_ID_THRESHOLD = 10_000;

/**
 * Builds the National Pokédex index from the species list and per-type
 * membership. Types come from `/type/{name}`, which lists each Pokémon with its
 * slot, so no per-Pokémon detail request is needed.
 */
export function buildPokedexIndex(species: RawListEntry[], typeMembers: RawTypeMembers[]): PokemonSummary[] {
  const typesById = new Map<number, { slot: number; name: string }[]>();
  for (const type of typeMembers) {
    if (!isPokemonType(type.name)) continue;
    for (const member of type.pokemon) {
      if (member.id >= FORM_ID_THRESHOLD) continue;
      const list = typesById.get(member.id) ?? [];
      if (!list.some((t) => t.name === type.name)) list.push({ slot: member.slot, name: type.name });
      typesById.set(member.id, list);
    }
  }

  return species
    .filter((entry) => entry.id < FORM_ID_THRESHOLD)
    .map((entry) => ({
      id: entry.id,
      slug: entry.name,
      name: formatPokemonName(entry.name),
      types: (typesById.get(entry.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.name),
    }))
    .sort((a, b) => a.id - b.id);
}

/**
 * Resolves a route segment (species slug, default form name, or National
 * Pokédex number) to an index entry.
 */
export function resolvePokemonParam(
  param: string,
  index: PokemonSummary[],
  pokemonNames: Map<number, string> = new Map(),
): PokemonSummary | null {
  const value = decodeURIComponent(param).trim().toLowerCase();
  if (!value) return null;
  if (/^\d+$/.test(value)) {
    const id = Number(value);
    return index.find((p) => p.id === id) ?? null;
  }
  return (
    index.find((p) => p.slug === value) ??
    index.find((p) => pokemonNames.get(p.id) === value) ??
    null
  );
}

export function toStats(raw: RawPokemon["stats"]): { stats: StatValue[]; total: number } {
  const stats = raw.map((s) => ({ key: s.name, label: formatStatLabel(s.name), value: s.value }));
  return { stats, total: stats.reduce((sum, s) => sum + s.value, 0) };
}

/** Bar fill ratio in [0, 1] for a base stat. */
export function statRatio(value: number, max: number = MAX_BASE_STAT): number {
  if (!Number.isFinite(value) || value <= 0 || max <= 0) return 0;
  return Math.min(value / max, 1);
}

export function toSprites(raw: RawPokemon["sprites"]): SpriteImage[] {
  const candidates: [string, string | null, boolean][] = [
    ["Official artwork", raw.officialArtwork, false],
    ["Official artwork · Shiny", raw.officialArtworkShiny, false],
    ["HOME", raw.home, false],
    ["HOME · Shiny", raw.homeShiny, false],
    ["Front", raw.frontDefault, true],
    ["Back", raw.backDefault, true],
    ["Front · Shiny", raw.frontShiny, true],
    ["Back · Shiny", raw.backShiny, true],
  ];
  return candidates.flatMap(([label, url, pixelated]) => (url ? [{ label, url, pixelated }] : []));
}

/** Picks the most recent English flavor text (PokéAPI lists entries oldest first). */
export function latestFlavorText(entries: RawSpecies["flavorTexts"]): { text: string; version: string } | null {
  const last = entries.at(-1);
  return last ? { text: cleanFlavorText(last.text), version: last.version } : null;
}

const SELECTED_MOVE_LIMIT = 12;

/**
 * Selects level-up moves from the most recent version group in which the
 * Pokémon learns moves by level-up, ordered by level.
 */
export function selectMoves(
  moves: RawPokemon["moves"],
  limit: number = SELECTED_MOVE_LIMIT,
): { versionGroup: string | null; refs: MoveRef[] } {
  let latest: { id: number; name: string } | null = null;
  for (const move of moves) {
    for (const d of move.details) {
      if (d.method !== "level-up" || d.versionGroupId === null) continue;
      if (!latest || d.versionGroupId > latest.id) latest = { id: d.versionGroupId, name: d.versionGroup };
    }
  }
  if (!latest) return { versionGroup: null, refs: [] };

  const group = latest.name;
  const refs = moves
    .flatMap((move) => {
      const levels = move.details
        .filter((d) => d.method === "level-up" && d.versionGroup === group)
        .map((d) => d.level);
      return levels.length ? [{ slug: move.name, level: Math.min(...levels) }] : [];
    })
    .sort((a, b) => a.level - b.level || a.slug.localeCompare(b.slug))
    .slice(0, limit);

  return { versionGroup: group, refs };
}

export function toAbilityInfo(ref: RawPokemon["abilities"][number], details: RawAbility | null): AbilityInfo {
  return {
    slug: ref.name,
    name: details?.englishName ?? titleCase(ref.name),
    isHidden: ref.isHidden,
    effect: details?.shortEffect ?? (details?.flavorText ? cleanFlavorText(details.flavorText) : null),
  };
}

export function toMoveInfo(ref: MoveRef, details: RawMove | null): MoveInfo {
  return {
    slug: ref.slug,
    name: details?.englishName ?? titleCase(ref.slug),
    level: ref.level,
    type: details?.type ?? null,
    power: details?.power ?? null,
    accuracy: details?.accuracy ?? null,
    pp: details?.pp ?? null,
    damageClass: details?.damageClass ?? null,
  };
}

const TIME_OF_DAY: Record<string, string> = { day: "during the day", night: "at night", dusk: "at dusk" };

/** Converts one PokéAPI evolution detail into a short human-readable condition. */
export function describeEvolutionDetail(d: RawEvolutionDetail): string {
  const parts: string[] = [];
  const trigger = d.trigger;

  if (trigger === "level-up") parts.push(d.minLevel !== null ? `Level ${d.minLevel}` : "Level up");
  else if (trigger === "use-item") parts.push(d.item ? `Use ${titleCase(d.item)}` : "Use an item");
  else if (trigger === "trade") parts.push(d.tradeSpecies ? `Trade for ${formatPokemonName(d.tradeSpecies)}` : "Trade");
  else if (trigger === "shed") parts.push("Level 20 with an empty party slot and a Poké Ball");
  else if (trigger) parts.push(titleCase(trigger));

  if (trigger !== "use-item" && d.item) parts.push(`using ${titleCase(d.item)}`);
  if (d.heldItem) parts.push(`holding ${titleCase(d.heldItem)}`);
  if (d.minHappiness !== null) parts.push(`with high friendship (${d.minHappiness}+)`);
  if (d.minAffection !== null) parts.push(`with high affection (${d.minAffection}+)`);
  if (d.minBeauty !== null) parts.push(`with high beauty (${d.minBeauty}+)`);
  if (d.knownMove) parts.push(`knowing ${titleCase(d.knownMove)}`);
  if (d.knownMoveType) parts.push(`knowing a ${titleCase(d.knownMoveType)}-type move`);
  if (d.location) parts.push(`at ${titleCase(d.location)}`);
  if (d.timeOfDay && TIME_OF_DAY[d.timeOfDay]) parts.push(TIME_OF_DAY[d.timeOfDay]);
  if (d.gender === 1) parts.push("(female)");
  if (d.gender === 2) parts.push("(male)");
  if (d.needsOverworldRain) parts.push("while it is raining");
  if (d.turnUpsideDown) parts.push("with the console upside down");
  if (d.partySpecies) parts.push(`with ${formatPokemonName(d.partySpecies)} in the party`);
  if (d.partyType) parts.push(`with a ${titleCase(d.partyType)}-type in the party`);
  if (d.relativePhysicalStats === 1) parts.push("(Attack > Defense)");
  if (d.relativePhysicalStats === -1) parts.push("(Attack < Defense)");
  if (d.relativePhysicalStats === 0) parts.push("(Attack = Defense)");

  return parts.length ? parts.join(" ") : "Special condition";
}

/** Deduplicated conditions, preferring PokéAPI's canonical (`is_default`) details. */
export function describeEvolution(details: RawEvolutionDetail[]): string[] {
  const preferred = details.some((d) => d.isDefault) ? details.filter((d) => d.isDefault) : details;
  return [...new Set(preferred.map(describeEvolutionDetail))];
}

export function toEvolutionTree(link: RawEvolutionLink, isRoot = true): EvolutionNode {
  return {
    speciesId: link.speciesId,
    slug: link.speciesName,
    name: formatPokemonName(link.speciesName),
    conditions: isRoot ? [] : describeEvolution(link.details),
    evolvesTo: link.evolvesTo.map((child) => toEvolutionTree(child, false)),
  };
}

/** Counts the stages in an evolution tree. */
export function countEvolutionNodes(node: EvolutionNode): number {
  return 1 + node.evolvesTo.reduce((sum, child) => sum + countEvolutionNodes(child), 0);
}

export interface DetailInputs {
  pokemon: RawPokemon;
  species: RawSpecies | null;
  evolution: RawEvolutionLink | null;
  abilities: (RawAbility | null)[];
}

export function toPokemonDetail({ pokemon, species, evolution, abilities }: DetailInputs): PokemonDetail {
  const { stats, total } = toStats(pokemon.stats);
  const flavor = species ? latestFlavorText(species.flavorTexts) : null;
  const { versionGroup, refs } = selectMoves(pokemon.moves);
  const slug = species?.name ?? pokemon.speciesName;

  return {
    id: species?.id ?? pokemon.id,
    pokemonName: pokemon.name,
    slug,
    name: species?.englishName ?? formatPokemonName(slug),
    genus: species?.genus ?? null,
    types: pokemon.types.map((t) => t.name),
    heightM: decimetresToMetres(pokemon.height),
    weightKg: hectogramsToKilograms(pokemon.weight),
    baseExperience: pokemon.baseExperience,
    abilities: pokemon.abilities.map((ref, i) => toAbilityInfo(ref, abilities[i] ?? null)),
    stats,
    statTotal: total,
    artwork: pickImage(pokemon.sprites.officialArtwork, pokemon.sprites.home, pokemon.sprites.frontDefault),
    shinyArtwork: pickImage(pokemon.sprites.officialArtworkShiny, pokemon.sprites.homeShiny, pokemon.sprites.frontShiny),
    sprites: toSprites(pokemon.sprites),
    flavorText: flavor?.text ?? null,
    flavorVersion: flavor?.version || null,
    games: [...new Set(pokemon.gameVersions)],
    generation: species?.generation ?? null,
    habitat: species?.habitat ?? null,
    captureRate: species?.captureRate ?? null,
    isLegendary: species?.isLegendary ?? false,
    isMythical: species?.isMythical ?? false,
    isBaby: species?.isBaby ?? false,
    evolution: evolution ? toEvolutionTree(evolution) : null,
    moveRefs: refs,
    totalMoves: pokemon.moves.length,
    versionGroup,
  };
}
