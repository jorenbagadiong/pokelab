import { beforeEach, describe, expect, it, vi } from "vitest";
import { eeveeChainResponse, pokemonEeveeResponse, speciesEeveeResponse } from "@/test/fixtures";

// Outside Next.js the cache directives are inert; stub the cache APIs.
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));

const { findPokemon, getPokemonDetail } = await import("./pokeapi");
const { loadPokemonPage } = await import("@/features/pokemon-detail/load-pokemon-page");

const BASE = "https://pokeapi.co/api/v2";

function list(kind: string, names: [number, string][]) {
  return { count: names.length, results: names.map(([id, name]) => ({ name, url: `${BASE}/${kind}/${id}/` })) };
}

const routes: Record<string, unknown> = {
  "/pokemon-species?limit=2000": list("pokemon-species", [
    [132, "ditto"],
    [133, "eevee"],
    [134, "vaporeon"],
    [386, "deoxys"],
  ]),
  "/pokemon?limit=2000": list("pokemon", [
    [132, "ditto"],
    [133, "eevee"],
    [134, "vaporeon"],
    [386, "deoxys-normal"],
    [10001, "deoxys-attack"],
  ]),
  "/type/normal": { name: "normal", pokemon: [{ slot: 1, pokemon: { name: "eevee", url: `${BASE}/pokemon/133/` } }, { slot: 1, pokemon: { name: "ditto", url: `${BASE}/pokemon/132/` } }] },
  "/type/water": { name: "water", pokemon: [{ slot: 1, pokemon: { name: "vaporeon", url: `${BASE}/pokemon/134/` } }] },
  "/type/psychic": { name: "psychic", pokemon: [{ slot: 1, pokemon: { name: "deoxys-normal", url: `${BASE}/pokemon/386/` } }] },
  "/pokemon/133": pokemonEeveeResponse,
  "/pokemon-species/133": speciesEeveeResponse,
  "/evolution-chain/67": eeveeChainResponse,
};

let failing = new Set<string>();

beforeEach(() => {
  failing = new Set();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const path = input.replace(BASE, "");
      if (failing.has(path)) return new Response("", { status: 503 });
      if (path.startsWith("/type/") && !(path in routes)) return Response.json({ name: path.slice(6), pokemon: [] });
      if (path in routes) return Response.json(routes[path]);
      return new Response("Not Found", { status: 404 });
    }),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("findPokemon", () => {
  it("resolves slugs, numbers and default form names", async () => {
    expect((await findPokemon("eevee"))?.id).toBe(133);
    expect((await findPokemon("133"))?.slug).toBe("eevee");
    expect((await findPokemon("deoxys-normal"))?.slug).toBe("deoxys");
  });

  it("returns null for invalid Pokémon routes without hitting detail endpoints", async () => {
    expect(await findPokemon("notapokemon")).toBeNull();
    expect(await findPokemon("deoxys-attack")).toBeNull(); // alternate form, not a National Pokédex entry
    expect(await findPokemon("%E0%A4%A")).toBeNull(); // malformed encoding
    expect(await findPokemon("../../etc")).toBeNull();
    expect(await findPokemon("x".repeat(200))).toBeNull();
    const calls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(calls.some((url) => url.includes("/pokemon/notapokemon"))).toBe(false);
  });
});

describe("getPokemonDetail", () => {
  it("combines Pokémon, species, evolution and ability data", async () => {
    const detail = await getPokemonDetail(133);
    expect(detail?.name).toBe("Eevee");
    expect(detail?.genus).toBe("Evolution Pokémon");
    expect(detail?.evolution?.evolvesTo.map((n) => n.slug)).toEqual(["vaporeon", "jolteon", "espeon"]);
    // Ability endpoints 404 in this fixture: names fall back to formatted slugs, effects stay empty.
    expect(detail?.abilities.map((a) => [a.name, a.effect])).toEqual([
      ["Run Away", null],
      ["Adaptability", null],
      ["Anticipation", null],
    ]);
  });

  it("degrades gracefully when optional species data fails", async () => {
    failing.add("/pokemon-species/133");
    const detail = await getPokemonDetail(133);
    expect(detail?.name).toBe("Eevee");
    expect(detail?.genus).toBeNull();
    expect(detail?.evolution).toBeNull();
  });

  it("returns null when the Pokémon does not exist", async () => {
    expect(await getPokemonDetail(99999)).toBeNull();
  });

  it("throws when the core Pokémon request fails, so the error boundary can offer a retry", async () => {
    failing.add("/pokemon/133");
    await expect(getPokemonDetail(133)).rejects.toThrow(/503/);
  });
});

describe("loadPokemonPage", () => {
  it("returns not-found for invalid names", async () => {
    expect(await loadPokemonPage("notapokemon")).toEqual({ kind: "not-found" });
  });

  it("redirects numeric ids and form names to the canonical slug", async () => {
    expect(await loadPokemonPage("133")).toEqual({ kind: "redirect", to: "/pokemon/eevee" });
    expect(await loadPokemonPage("deoxys-normal")).toEqual({ kind: "redirect", to: "/pokemon/deoxys" });
  });

  it("loads the detail with previous and next entries", async () => {
    const result = await loadPokemonPage("eevee");
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.detail.id).toBe(133);
    expect(result.prev?.slug).toBe("ditto");
    expect(result.next?.slug).toBe("vaporeon");
  });
});
