import { describe, expect, it } from "vitest";
import {
  charmanderChainResponse,
  eeveeChainResponse,
  pokemonEeveeResponse,
  sampleIndex,
  speciesEeveeResponse,
  taurosChainResponse,
} from "@/test/fixtures";
import { ApiParseError } from "./errors";
import { idFromUrl } from "./parse";
import {
  parseAbility,
  parseEvolutionChain,
  parsePokemon,
  parseResourceList,
  parseSpecies,
  parseTypeMembers,
  type RawEvolutionDetail,
} from "./schemas";
import {
  buildPokedexIndex,
  countEvolutionNodes,
  describeEvolution,
  describeEvolutionDetail,
  resolvePokemonParam,
  selectMoves,
  statRatio,
  toEvolutionTree,
  toPokemonDetail,
} from "./transform";

const baseDetail: RawEvolutionDetail = {
  trigger: "level-up",
  minLevel: null,
  item: null,
  heldItem: null,
  minHappiness: null,
  minAffection: null,
  minBeauty: null,
  timeOfDay: null,
  knownMove: null,
  knownMoveType: null,
  location: null,
  gender: null,
  needsOverworldRain: false,
  turnUpsideDown: false,
  tradeSpecies: null,
  partySpecies: null,
  partyType: null,
  relativePhysicalStats: null,
  isDefault: true,
};

describe("parsing", () => {
  it("extracts ids from resource URLs", () => {
    expect(idFromUrl("https://pokeapi.co/api/v2/pokemon/25/")).toBe(25);
    expect(idFromUrl("https://pokeapi.co/api/v2/pokemon/25")).toBe(25);
    expect(idFromUrl("https://pokeapi.co/api/v2/pokemon/")).toBeNull();
  });

  it("parses list responses", () => {
    const list = parseResourceList({
      count: 2,
      results: [
        { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon-species/1/" },
        { name: "ivysaur", url: "https://pokeapi.co/api/v2/pokemon-species/2/" },
      ],
    });
    expect(list).toEqual([
      { id: 1, name: "bulbasaur" },
      { id: 2, name: "ivysaur" },
    ]);
  });

  it("rejects responses missing required fields", () => {
    expect(() => parseResourceList({ count: 1 })).toThrow(ApiParseError);
    expect(() => parsePokemon({ ...pokemonEeveeResponse, id: "133" })).toThrow(ApiParseError);
    expect(() => parsePokemon(null)).toThrow(ApiParseError);
    expect(() => parseSpecies({ name: "eevee" })).toThrow(/species.id/);
  });

  it("tolerates missing optional fields", () => {
    const pokemon = parsePokemon({
      ...pokemonEeveeResponse,
      base_experience: null,
      sprites: null,
      abilities: undefined,
      moves: undefined,
      game_indices: undefined,
    });
    expect(pokemon.baseExperience).toBeNull();
    expect(pokemon.sprites.officialArtwork).toBeNull();
    expect(pokemon.abilities).toEqual([]);
    expect(pokemon.moves).toEqual([]);
    expect(pokemon.gameVersions).toEqual([]);

    const species = parseSpecies({ id: 999, name: "x", evolution_chain: null, habitat: null });
    expect(species.evolutionChainId).toBeNull();
    expect(species.habitat).toBeNull();
    expect(species.englishName).toBeNull();
    expect(species.flavorTexts).toEqual([]);
  });

  it("parses type membership with slots, skipping malformed entries", () => {
    const type = parseTypeMembers({
      name: "flying",
      pokemon: [
        { slot: 2, pokemon: { name: "charizard", url: "https://pokeapi.co/api/v2/pokemon/6/" } },
        { slot: 1, pokemon: { name: "tornadus", url: "https://pokeapi.co/api/v2/pokemon/641/" } },
        { pokemon: { name: "broken", url: "https://pokeapi.co/api/v2/pokemon/9/" } },
      ],
    });
    expect(type.pokemon).toEqual([
      { name: "charizard", id: 6, slot: 2 },
      { name: "tornadus", id: 641, slot: 1 },
    ]);
  });

  it("parses abilities with English effect text", () => {
    const ability = parseAbility({
      name: "run-away",
      names: [{ name: "Run Away", language: { name: "en", url: "" } }],
      effect_entries: [
        { short_effect: "Fuite assurée.", language: { name: "fr", url: "" } },
        { short_effect: "Ensures success fleeing from wild battles.", language: { name: "en", url: "" } },
      ],
      flavor_text_entries: [],
    });
    expect(ability.englishName).toBe("Run Away");
    expect(ability.shortEffect).toBe("Ensures success fleeing from wild battles.");
  });
});

describe("buildPokedexIndex", () => {
  const species = [
    { id: 6, name: "charizard" },
    { id: 1, name: "bulbasaur" },
    { id: 122, name: "mr-mime" },
    { id: 10034, name: "charizard-mega-x" },
  ];
  const types = [
    { name: "flying", pokemon: [{ name: "charizard", id: 6, slot: 2 }] },
    { name: "fire", pokemon: [{ name: "charizard", id: 6, slot: 1 }, { name: "charizard-mega-x", id: 10034, slot: 1 }] },
    { name: "grass", pokemon: [{ name: "bulbasaur", id: 1, slot: 1 }] },
    { name: "poison", pokemon: [{ name: "bulbasaur", id: 1, slot: 2 }] },
    { name: "shadow", pokemon: [{ name: "bulbasaur", id: 1, slot: 3 }] },
  ];

  it("sorts by number, orders types by slot and excludes forms and non-battle types", () => {
    expect(buildPokedexIndex(species, types)).toEqual([
      { id: 1, slug: "bulbasaur", name: "Bulbasaur", types: ["grass", "poison"] },
      { id: 6, slug: "charizard", name: "Charizard", types: ["fire", "flying"] },
      { id: 122, slug: "mr-mime", name: "Mr. Mime", types: [] },
    ]);
  });
});

describe("resolvePokemonParam (route resolution)", () => {
  const aliases = new Map([[386, "deoxys-normal"]]);

  it("resolves species slugs, numbers and default form names", () => {
    expect(resolvePokemonParam("eevee", sampleIndex)?.id).toBe(133);
    expect(resolvePokemonParam("133", sampleIndex)?.slug).toBe("eevee");
    expect(resolvePokemonParam("Mr-Mime", sampleIndex)?.id).toBe(122);
    expect(resolvePokemonParam("deoxys-normal", sampleIndex, aliases)?.slug).toBe("deoxys");
  });

  it("returns null for invalid Pokémon routes", () => {
    expect(resolvePokemonParam("notapokemon", sampleIndex)).toBeNull();
    expect(resolvePokemonParam("0", sampleIndex)).toBeNull();
    expect(resolvePokemonParam("99999", sampleIndex)).toBeNull();
    expect(resolvePokemonParam("", sampleIndex)).toBeNull();
    expect(resolvePokemonParam("charizard-mega-x", sampleIndex, aliases)).toBeNull();
  });
});

describe("toPokemonDetail", () => {
  const pokemon = parsePokemon(pokemonEeveeResponse);
  const species = parseSpecies(speciesEeveeResponse);
  const evolution = parseEvolutionChain(eeveeChainResponse);

  it("transforms real response shapes into the detail model", () => {
    const detail = toPokemonDetail({ pokemon, species, evolution, abilities: [null, null, null] });

    expect(detail).toMatchObject({
      id: 133,
      slug: "eevee",
      name: "Eevee",
      genus: "Evolution Pokémon",
      types: ["normal"],
      heightM: 0.3,
      weightKg: 6.5,
      baseExperience: 65,
      statTotal: 325,
      captureRate: 45,
      generation: "generation-i",
      habitat: "urban",
      games: ["red", "blue"],
    });
    expect(detail.stats.map((s) => s.label)).toEqual(["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"]);
    expect(detail.abilities.map((a) => [a.name, a.isHidden])).toEqual([
      ["Run Away", false],
      ["Adaptability", false],
      ["Anticipation", true],
    ]);
    // Latest English entry, with hard line breaks removed.
    expect(detail.flavorText).toBe("Harbors the potential to evolve into manifold forms. Within Eevee lies the key.");
    expect(detail.flavorVersion).toBe("legends-arceus");
    expect(detail.evolution?.evolvesTo).toHaveLength(3);
  });

  it("prefers official artwork and lists only available sprites", () => {
    const detail = toPokemonDetail({ pokemon, species, evolution, abilities: [] });
    expect(detail.artwork).toContain("/official-artwork/133.png");
    expect(detail.shinyArtwork).toContain("/official-artwork/shiny/133.png");
    const labels = detail.sprites.map((s) => s.label);
    expect(labels).toEqual(["Official artwork", "Official artwork · Shiny", "Front", "Back", "Front · Shiny"]);
    expect(detail.sprites.find((s) => s.label === "Front")?.pixelated).toBe(true);
  });

  it("handles missing artwork and missing species data without inventing values", () => {
    const bare = parsePokemon({ ...pokemonEeveeResponse, sprites: {}, base_experience: null });
    const detail = toPokemonDetail({ pokemon: bare, species: null, evolution: null, abilities: [] });
    expect(detail.artwork).toBeNull();
    expect(detail.shinyArtwork).toBeNull();
    expect(detail.sprites).toEqual([]);
    expect(detail.genus).toBeNull();
    expect(detail.flavorText).toBeNull();
    expect(detail.evolution).toBeNull();
    expect(detail.baseExperience).toBeNull();
    expect(detail.captureRate).toBeNull();
    expect(detail.name).toBe("Eevee");
  });

  it("falls back to sprites when official artwork is missing", () => {
    const partial = parsePokemon({
      ...pokemonEeveeResponse,
      sprites: { front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png" },
    });
    expect(toPokemonDetail({ pokemon: partial, species: null, evolution: null, abilities: [] }).artwork).toMatch(/133\.png$/);
  });

  it("selects level-up moves from the most recent version group, ordered by level", () => {
    const { versionGroup, refs } = selectMoves(pokemon.moves);
    expect(versionGroup).toBe("scarlet-violet");
    expect(refs).toEqual([
      { slug: "tackle", level: 1 },
      { slug: "growl", level: 5 },
      { slug: "bite", level: 30 },
    ]);
    expect(selectMoves([])).toEqual({ versionGroup: null, refs: [] });
  });

  it("scales stat bars to the maximum base stat", () => {
    expect(statRatio(255)).toBe(1);
    expect(statRatio(51)).toBeCloseTo(0.2);
    expect(statRatio(300)).toBe(1);
    expect(statRatio(0)).toBe(0);
    expect(statRatio(Number.NaN)).toBe(0);
  });
});

describe("evolution chains", () => {
  it("builds a branching tree (Eevee) with deduplicated canonical conditions", () => {
    const tree = toEvolutionTree(parseEvolutionChain(eeveeChainResponse));
    expect(tree.slug).toBe("eevee");
    expect(tree.conditions).toEqual([]);
    expect(tree.evolvesTo.map((n) => [n.name, n.conditions])).toEqual([
      ["Vaporeon", ["Use Water Stone"]],
      ["Jolteon", ["Use Thunder Stone"]],
      ["Espeon", ["Level up with high friendship (160+) during the day"]],
    ]);
    expect(countEvolutionNodes(tree)).toBe(4);
  });

  it("builds a linear three-stage chain", () => {
    const tree = toEvolutionTree(parseEvolutionChain(charmanderChainResponse));
    expect(tree.evolvesTo[0].conditions).toEqual(["Level 16"]);
    expect(tree.evolvesTo[0].evolvesTo[0].conditions).toEqual(["Level 36"]);
    expect(countEvolutionNodes(tree)).toBe(3);
  });

  it("handles Pokémon that do not evolve", () => {
    const tree = toEvolutionTree(parseEvolutionChain(taurosChainResponse));
    expect(tree.evolvesTo).toEqual([]);
    expect(countEvolutionNodes(tree)).toBe(1);
  });

  it("describes other evolution triggers", () => {
    expect(describeEvolutionDetail({ ...baseDetail, trigger: "trade", heldItem: "metal-coat" })).toBe("Trade holding Metal Coat");
    expect(describeEvolutionDetail({ ...baseDetail, minLevel: 20, relativePhysicalStats: 1 })).toBe("Level 20 (Attack > Defense)");
    expect(describeEvolutionDetail({ ...baseDetail, trigger: "level-up", knownMoveType: "fairy", minAffection: 2 })).toBe(
      "Level up with high affection (2+) knowing a Fairy-type move",
    );
    expect(describeEvolutionDetail({ ...baseDetail, trigger: null })).toBe("Special condition");
    expect(describeEvolution([])).toEqual([]);
  });
});
