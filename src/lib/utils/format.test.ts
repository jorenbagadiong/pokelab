import { describe, expect, it } from "vitest";
import {
  cleanFlavorText,
  decimetresToMetres,
  formatDexNumber,
  formatGeneration,
  formatKilograms,
  formatMetres,
  formatPokemonName,
  formatStatLabel,
  formatVersionName,
  hectogramsToKilograms,
} from "./format";

describe("unit conversions", () => {
  it("converts PokéAPI decimetres to metres", () => {
    expect(decimetresToMetres(3)).toBe(0.3); // Eevee
    expect(decimetresToMetres(17)).toBe(1.7); // Charizard
    expect(decimetresToMetres(88)).toBe(8.8); // Onix
    expect(decimetresToMetres(1)).toBe(0.1);
    expect(decimetresToMetres(0)).toBe(0);
  });

  it("converts PokéAPI hectograms to kilograms", () => {
    expect(hectogramsToKilograms(65)).toBe(6.5); // Eevee
    expect(hectogramsToKilograms(905)).toBe(90.5); // Charizard
    expect(hectogramsToKilograms(9999)).toBe(999.9);
    expect(hectogramsToKilograms(1)).toBe(0.1);
  });

  it("formats metric values with one decimal", () => {
    expect(formatMetres(0.3)).toBe("0.3 m");
    expect(formatMetres(2)).toBe("2.0 m");
    expect(formatKilograms(6.5)).toBe("6.5 kg");
    expect(formatKilograms(999.9)).toBe("999.9 kg");
  });
});

describe("names and labels", () => {
  it("title-cases regular slugs", () => {
    expect(formatPokemonName("bulbasaur")).toBe("Bulbasaur");
    expect(formatPokemonName("tapu-koko")).toBe("Tapu Koko");
    expect(formatPokemonName("iron-valiant")).toBe("Iron Valiant");
  });

  it("uses official spellings for irregular names", () => {
    expect(formatPokemonName("mr-mime")).toBe("Mr. Mime");
    expect(formatPokemonName("nidoran-f")).toBe("Nidoran♀");
    expect(formatPokemonName("ho-oh")).toBe("Ho-Oh");
    expect(formatPokemonName("type-null")).toBe("Type: Null");
    expect(formatPokemonName("farfetchd")).toBe("Farfetch’d");
    expect(formatPokemonName("flabebe")).toBe("Flabébé");
  });

  it("pads Pokédex numbers to four digits", () => {
    expect(formatDexNumber(1)).toBe("#0001");
    expect(formatDexNumber(133)).toBe("#0133");
    expect(formatDexNumber(1025)).toBe("#1025");
  });

  it("labels stats, generations and versions", () => {
    expect(formatStatLabel("special-attack")).toBe("Sp. Atk");
    expect(formatStatLabel("hp")).toBe("HP");
    expect(formatGeneration("generation-iv")).toBe("Generation IV");
    expect(formatVersionName("firered")).toBe("FireRed");
    expect(formatVersionName("legends-arceus")).toBe("Legends: Arceus");
    expect(formatVersionName("x")).toBe("X");
    expect(formatVersionName("red-japan")).toBe("Red (Japan)");
  });
});

describe("cleanFlavorText", () => {
  it("removes form feeds, newlines and soft hyphens", () => {
    expect(cleanFlavorText("It may mutate if it is\nexposed\fto radiation.")).toBe("It may mutate if it is exposed to radiation.");
    expect(cleanFlavorText("Evo­\nlution  Pokémon ")).toBe("Evolution Pokémon");
  });
});
