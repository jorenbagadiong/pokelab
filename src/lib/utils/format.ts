/** Species slugs whose display names cannot be derived by title-casing. */
const NAME_OVERRIDES: Record<string, string> = {
  "nidoran-f": "Nidoran♀",
  "nidoran-m": "Nidoran♂",
  "mr-mime": "Mr. Mime",
  "mime-jr": "Mime Jr.",
  "mr-rime": "Mr. Rime",
  "ho-oh": "Ho-Oh",
  "porygon-z": "Porygon-Z",
  "type-null": "Type: Null",
  "jangmo-o": "Jangmo-o",
  "hakamo-o": "Hakamo-o",
  "kommo-o": "Kommo-o",
  "wo-chien": "Wo-Chien",
  "chien-pao": "Chien-Pao",
  "ting-lu": "Ting-Lu",
  "chi-yu": "Chi-Yu",
  farfetchd: "Farfetch’d",
  sirfetchd: "Sirfetch’d",
  flabebe: "Flabébé",
};

/** Title-cases a hyphenated PokéAPI slug: `special-attack` → `Special Attack`. */
export function titleCase(slug: string): string {
  return slug
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Display name for a species slug. */
export function formatPokemonName(slug: string): string {
  return NAME_OVERRIDES[slug] ?? titleCase(slug);
}

/** `25` → `#0025`. */
export function formatDexNumber(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

export function formatStatLabel(stat: string): string {
  return STAT_LABELS[stat] ?? titleCase(stat);
}

/** `generation-iv` → `Generation IV`. */
export function formatGeneration(slug: string): string {
  const [, numeral] = /^generation-([a-z]+)$/.exec(slug) ?? [];
  return numeral ? `Generation ${numeral.toUpperCase()}` : titleCase(slug);
}

const VERSION_OVERRIDES: Record<string, string> = {
  firered: "FireRed",
  leafgreen: "LeafGreen",
  heartgold: "HeartGold",
  soulsilver: "SoulSilver",
  "lets-go-pikachu": "Let’s Go, Pikachu!",
  "lets-go-eevee": "Let’s Go, Eevee!",
  "legends-arceus": "Legends: Arceus",
  "legends-za": "Legends: Z-A",
  "black-2": "Black 2",
  "white-2": "White 2",
  "omega-ruby": "Omega Ruby",
  "alpha-sapphire": "Alpha Sapphire",
  "ultra-sun": "Ultra Sun",
  "ultra-moon": "Ultra Moon",
  "brilliant-diamond": "Brilliant Diamond",
  "shining-pearl": "Shining Pearl",
};

export function formatVersionName(slug: string): string {
  if (VERSION_OVERRIDES[slug]) return VERSION_OVERRIDES[slug];
  // Japanese-only releases, e.g. `red-japan` → `Red (Japan)`.
  const japan = /^(.+)-japan$/.exec(slug);
  return japan ? `${formatVersionName(japan[1])} (Japan)` : titleCase(slug);
}

/** PokéAPI heights are in decimetres. */
export function decimetresToMetres(decimetres: number): number {
  return Math.round(decimetres * 10) / 100;
}

/** PokéAPI weights are in hectograms. */
export function hectogramsToKilograms(hectograms: number): number {
  return Math.round(hectograms * 10) / 100;
}

export function formatMetres(metres: number): string {
  return `${metres.toFixed(1)} m`;
}

export function formatKilograms(kg: number): string {
  return `${kg.toFixed(1)} kg`;
}

/**
 * Flavor text from older games contains hard line breaks, form feeds and
 * soft hyphens. Normalise them into a single readable paragraph.
 */
export function cleanFlavorText(text: string): string {
  return text
    .replace(/­\s*/g, "")
    .replace(/[\f\n\r\t\v]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
