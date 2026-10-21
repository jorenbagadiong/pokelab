import { describe, expect, it } from "vitest";
import { sampleIndex } from "@/test/fixtures";
import {
  DEFAULT_QUERY,
  filterPokemon,
  matchesSearch,
  pageWindow,
  paginate,
  parseDexNumber,
  parseQuery,
  runQuery,
  serializeQuery,
  sortPokemon,
} from "./query";

const names = (list: { name: string }[]) => list.map((p) => p.name);
const none = new Set<number>();

describe("search", () => {
  it("matches names case-insensitively and by partial text", () => {
    expect(names(filterPokemon(sampleIndex, { q: "char", type: null, favoritesOnly: false }))).toEqual(["Charmander", "Charizard"]);
    expect(names(filterPokemon(sampleIndex, { q: "PIKA", type: null, favoritesOnly: false }))).toEqual(["Pikachu"]);
  });

  it("ignores accents and punctuation", () => {
    const flabebe = sampleIndex.find((p) => p.slug === "flabebe")!;
    const mime = sampleIndex.find((p) => p.slug === "mr-mime")!;
    expect(matchesSearch(flabebe, "flabebe")).toBe(true);
    expect(matchesSearch(flabebe, "Flabébé")).toBe(true);
    expect(matchesSearch(mime, "mr mime")).toBe(true);
    expect(matchesSearch(mime, "mr. mime")).toBe(true);
  });

  it("matches Pokédex numbers exactly, with or without # and zero padding", () => {
    expect(parseDexNumber("#0025")).toBe(25);
    expect(parseDexNumber("25")).toBe(25);
    expect(parseDexNumber("0")).toBeNull();
    expect(parseDexNumber("25a")).toBeNull();
    expect(names(filterPokemon(sampleIndex, { q: "#25", type: null, favoritesOnly: false }))).toEqual(["Pikachu"]);
    expect(names(filterPokemon(sampleIndex, { q: "6", type: null, favoritesOnly: false }))).toEqual(["Charizard"]);
  });

  it("returns nothing for unmatched searches and everything for blank ones", () => {
    expect(filterPokemon(sampleIndex, { q: "zzz", type: null, favoritesOnly: false })).toEqual([]);
    expect(filterPokemon(sampleIndex, { q: "   ", type: null, favoritesOnly: false })).toHaveLength(sampleIndex.length);
  });
});

describe("filtering and sorting", () => {
  it("filters by any of a Pokémon's types", () => {
    expect(names(filterPokemon(sampleIndex, { q: "", type: "fire", favoritesOnly: false }))).toEqual(["Charmander", "Charizard"]);
    expect(names(filterPokemon(sampleIndex, { q: "", type: "poison", favoritesOnly: false }))).toEqual(["Bulbasaur", "Nidoran♀"]);
  });

  it("combines type filter and search", () => {
    expect(names(filterPokemon(sampleIndex, { q: "zard", type: "flying", favoritesOnly: false }))).toEqual(["Charizard"]);
    expect(filterPokemon(sampleIndex, { q: "pika", type: "fire", favoritesOnly: false })).toEqual([]);
  });

  it("filters to favorites", () => {
    expect(names(filterPokemon(sampleIndex, { q: "", type: null, favoritesOnly: true }, new Set([25, 133])))).toEqual(["Pikachu", "Eevee"]);
    expect(filterPokemon(sampleIndex, { q: "", type: null, favoritesOnly: true }, none)).toEqual([]);
  });

  it("sorts by number and by name in both directions without mutating input", () => {
    const original = [...sampleIndex];
    expect(sortPokemon(sampleIndex, "id-desc")[0].id).toBe(669);
    expect(names(sortPokemon(sampleIndex, "name-asc")).slice(0, 3)).toEqual(["Bulbasaur", "Charizard", "Charmander"]);
    expect(names(sortPokemon(sampleIndex, "name-desc"))[0]).toBe("Pikachu");
    expect(sortPokemon(sortPokemon(sampleIndex, "name-desc"), "id-asc").map((p) => p.id)).toEqual(original.map((p) => p.id));
    expect(sampleIndex).toEqual(original);
  });
});

describe("pagination", () => {
  const items = Array.from({ length: 50 }, (_, i) => i + 1);

  it("slices pages and reports 1-based ranges", () => {
    expect(paginate(items, 1, 24)).toMatchObject({ page: 1, pageCount: 3, total: 50, start: 1, end: 24 });
    expect(paginate(items, 3, 24)).toMatchObject({ items: [49, 50], start: 49, end: 50 });
  });

  it("clamps out-of-range pages", () => {
    expect(paginate(items, 99, 24).page).toBe(3);
    expect(paginate(items, -4, 24).page).toBe(1);
    expect(paginate(items, Number.NaN, 24).page).toBe(1);
  });

  it("handles empty results", () => {
    expect(paginate([], 5, 24)).toEqual({ items: [], page: 1, pageCount: 1, total: 0, start: 0, end: 0 });
  });

  it("computes a compact page window with gaps", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 5)).toEqual([1, 2, null, 5]);
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]); // a single missing page is filled, not elided
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(3, 10)).toEqual([1, 2, 3, 4, null, 10]);
    expect(pageWindow(10, 43)).toEqual([1, null, 9, 10, 11, null, 43]);
  });

  it("runs the full pipeline: filter → sort → paginate", () => {
    const result = runQuery(sampleIndex, { ...DEFAULT_QUERY, type: "fire", sort: "id-desc" }, none);
    expect(names(result.items)).toEqual(["Charizard", "Charmander"]);
    expect(result.total).toBe(2);
  });
});

describe("URL state", () => {
  it("parses valid params and ignores invalid ones", () => {
    expect(parseQuery(new URLSearchParams("q=pika&type=electric&sort=name-desc&page=3&favorites=1"))).toEqual({
      q: "pika",
      type: "electric",
      sort: "name-desc",
      page: 3,
      favoritesOnly: true,
    });
    expect(parseQuery(new URLSearchParams("type=shadow&sort=random&page=-2&favorites=yes"))).toEqual(DEFAULT_QUERY);
    expect(parseQuery(new URLSearchParams("page=1.5")).page).toBe(1);
    expect(parseQuery(new URLSearchParams(`q=${"a".repeat(500)}`)).q).toHaveLength(60);
  });

  it("omits defaults when serializing and round-trips", () => {
    expect(serializeQuery(DEFAULT_QUERY)).toBe("");
    const query = { q: "mr mime", type: "psychic" as const, sort: "name-asc" as const, page: 2, favoritesOnly: false };
    expect(parseQuery(new URLSearchParams(serializeQuery(query)))).toEqual(query);
  });

  it("resetting restores the default query", () => {
    expect(parseQuery(new URLSearchParams(serializeQuery(DEFAULT_QUERY)))).toEqual(DEFAULT_QUERY);
  });
});
