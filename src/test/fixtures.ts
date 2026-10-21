import type { PokemonSummary } from "@/types/pokemon";

/** Trimmed real PokéAPI response shapes used by the tests. */

export const pokemonEeveeResponse = {
  id: 133,
  name: "eevee",
  height: 3,
  weight: 65,
  base_experience: 65,
  species: { name: "eevee", url: "https://pokeapi.co/api/v2/pokemon-species/133/" },
  types: [{ slot: 1, type: { name: "normal", url: "https://pokeapi.co/api/v2/type/1/" } }],
  abilities: [
    { is_hidden: false, slot: 1, ability: { name: "run-away", url: "https://pokeapi.co/api/v2/ability/50/" } },
    { is_hidden: false, slot: 2, ability: { name: "adaptability", url: "https://pokeapi.co/api/v2/ability/91/" } },
    { is_hidden: true, slot: 3, ability: { name: "anticipation", url: "https://pokeapi.co/api/v2/ability/107/" } },
  ],
  stats: [
    { base_stat: 55, effort: 0, stat: { name: "hp", url: "https://pokeapi.co/api/v2/stat/1/" } },
    { base_stat: 55, effort: 0, stat: { name: "attack", url: "https://pokeapi.co/api/v2/stat/2/" } },
    { base_stat: 50, effort: 0, stat: { name: "defense", url: "https://pokeapi.co/api/v2/stat/3/" } },
    { base_stat: 45, effort: 0, stat: { name: "special-attack", url: "https://pokeapi.co/api/v2/stat/4/" } },
    { base_stat: 65, effort: 1, stat: { name: "special-defense", url: "https://pokeapi.co/api/v2/stat/5/" } },
    { base_stat: 55, effort: 0, stat: { name: "speed", url: "https://pokeapi.co/api/v2/stat/6/" } },
  ],
  sprites: {
    front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png",
    back_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/133.png",
    front_shiny: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/133.png",
    back_shiny: null,
    other: {
      "official-artwork": {
        front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png",
        front_shiny: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/133.png",
      },
      home: { front_default: null, front_shiny: null },
    },
  },
  game_indices: [
    { game_index: 102, version: { name: "red", url: "https://pokeapi.co/api/v2/version/1/" } },
    { game_index: 102, version: { name: "blue", url: "https://pokeapi.co/api/v2/version/2/" } },
  ],
  moves: [
    {
      move: { name: "tackle", url: "https://pokeapi.co/api/v2/move/33/" },
      version_group_details: [
        { level_learned_at: 1, move_learn_method: { name: "level-up", url: "" }, version_group: { name: "red-blue", url: "https://pokeapi.co/api/v2/version-group/1/" } },
        { level_learned_at: 1, move_learn_method: { name: "level-up", url: "" }, version_group: { name: "scarlet-violet", url: "https://pokeapi.co/api/v2/version-group/25/" } },
      ],
    },
    {
      move: { name: "bite", url: "https://pokeapi.co/api/v2/move/44/" },
      version_group_details: [
        { level_learned_at: 30, move_learn_method: { name: "level-up", url: "" }, version_group: { name: "scarlet-violet", url: "https://pokeapi.co/api/v2/version-group/25/" } },
      ],
    },
    {
      move: { name: "growl", url: "https://pokeapi.co/api/v2/move/45/" },
      version_group_details: [
        { level_learned_at: 5, move_learn_method: { name: "level-up", url: "" }, version_group: { name: "scarlet-violet", url: "https://pokeapi.co/api/v2/version-group/25/" } },
      ],
    },
    {
      move: { name: "pay-day", url: "https://pokeapi.co/api/v2/move/6/" },
      version_group_details: [
        { level_learned_at: 0, move_learn_method: { name: "machine", url: "" }, version_group: { name: "sword-shield", url: "https://pokeapi.co/api/v2/version-group/20/" } },
      ],
    },
  ],
};

export const speciesEeveeResponse = {
  id: 133,
  name: "eevee",
  names: [
    { name: "イーブイ", language: { name: "ja", url: "" } },
    { name: "Eevee", language: { name: "en", url: "" } },
  ],
  genera: [{ genus: "Evolution Pokémon", language: { name: "en", url: "" } }],
  flavor_text_entries: [
    { flavor_text: "Its genetic code is irregular.\fIt may mutate if it is\nexposed to radiation.", language: { name: "en", url: "" }, version: { name: "red", url: "" } },
    { flavor_text: "Harbors the potential to evolve into manifold forms.\nWithin Eevee lies the key.", language: { name: "en", url: "" }, version: { name: "legends-arceus", url: "" } },
    { flavor_text: "Texte français.", language: { name: "fr", url: "" }, version: { name: "legends-arceus", url: "" } },
  ],
  evolution_chain: { url: "https://pokeapi.co/api/v2/evolution-chain/67/" },
  generation: { name: "generation-i", url: "" },
  habitat: { name: "urban", url: "" },
  capture_rate: 45,
  is_legendary: false,
  is_mythical: false,
  is_baby: false,
};

const species = (name: string, id: number) => ({ name, url: `https://pokeapi.co/api/v2/pokemon-species/${id}/` });

const detail = (overrides: Record<string, unknown>) => ({
  is_default: true,
  trigger: { name: "level-up", url: "" },
  item: null,
  held_item: null,
  min_level: null,
  min_happiness: null,
  min_affection: null,
  min_beauty: null,
  time_of_day: "",
  known_move: null,
  known_move_type: null,
  location: null,
  gender: null,
  needs_overworld_rain: false,
  turn_upside_down: false,
  trade_species: null,
  party_species: null,
  party_type: null,
  relative_physical_stats: null,
  ...overrides,
});

export const eeveeChainResponse = {
  id: 67,
  chain: {
    species: species("eevee", 133),
    evolution_details: [],
    evolves_to: [
      { species: species("vaporeon", 134), evolution_details: [detail({ trigger: { name: "use-item", url: "" }, item: { name: "water-stone", url: "" } })], evolves_to: [] },
      { species: species("jolteon", 135), evolution_details: [detail({ trigger: { name: "use-item", url: "" }, item: { name: "thunder-stone", url: "" } })], evolves_to: [] },
      {
        species: species("espeon", 196),
        evolution_details: [
          detail({ min_happiness: 160, time_of_day: "day" }),
          detail({ is_default: false, min_happiness: 220, time_of_day: "day" }),
        ],
        evolves_to: [],
      },
    ],
  },
};

export const charmanderChainResponse = {
  id: 2,
  chain: {
    species: species("charmander", 4),
    evolution_details: [],
    evolves_to: [
      {
        species: species("charmeleon", 5),
        evolution_details: [detail({ min_level: 16 })],
        evolves_to: [{ species: species("charizard", 6), evolution_details: [detail({ min_level: 36 })], evolves_to: [] }],
      },
    ],
  },
};

export const taurosChainResponse = {
  id: 59,
  chain: { species: species("tauros", 128), evolution_details: [], evolves_to: [] },
};

export const sampleIndex: PokemonSummary[] = [
  { id: 1, slug: "bulbasaur", name: "Bulbasaur", types: ["grass", "poison"] },
  { id: 4, slug: "charmander", name: "Charmander", types: ["fire"] },
  { id: 6, slug: "charizard", name: "Charizard", types: ["fire", "flying"] },
  { id: 25, slug: "pikachu", name: "Pikachu", types: ["electric"] },
  { id: 29, slug: "nidoran-f", name: "Nidoran♀", types: ["poison"] },
  { id: 122, slug: "mr-mime", name: "Mr. Mime", types: ["psychic", "fairy"] },
  { id: 133, slug: "eevee", name: "Eevee", types: ["normal"] },
  { id: 386, slug: "deoxys", name: "Deoxys", types: ["psychic"] },
  { id: 669, slug: "flabebe", name: "Flabébé", types: ["fairy"] },
];
