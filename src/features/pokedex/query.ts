import { PAGE_SIZE } from "@/constants/app";
import { isPokemonType, type PokemonType } from "@/constants/types";
import type { PokemonSummary } from "@/types/pokemon";

export const SORT_OPTIONS = [
  { value: "id-asc", label: "Number ↑" },
  { value: "id-desc", label: "Number ↓" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const DEFAULT_SORT: SortOption = "id-asc";

export interface PokedexQuery {
  q: string;
  type: PokemonType | null;
  sort: SortOption;
  page: number;
  favoritesOnly: boolean;
}

export const DEFAULT_QUERY: PokedexQuery = { q: "", type: null, sort: DEFAULT_SORT, page: 1, favoritesOnly: false };

const MAX_QUERY_LENGTH = 60;

function isSortOption(value: string | null): value is SortOption {
  return SORT_OPTIONS.some((o) => o.value === value);
}

interface ParamsLike {
  get(name: string): string | null;
}

/** Reads listing state from URL search params, ignoring invalid values. */
export function parseQuery(params: ParamsLike): PokedexQuery {
  const q = (params.get("q") ?? "").slice(0, MAX_QUERY_LENGTH);
  const typeParam = params.get("type");
  const sortParam = params.get("sort");
  const page = Number(params.get("page"));

  return {
    q,
    type: typeParam && isPokemonType(typeParam) ? typeParam : null,
    sort: isSortOption(sortParam) ? sortParam : DEFAULT_SORT,
    page: Number.isSafeInteger(page) && page >= 1 ? page : 1,
    favoritesOnly: params.get("favorites") === "1",
  };
}

/** Serializes listing state, omitting defaults to keep URLs short. */
export function serializeQuery(query: PokedexQuery): string {
  const params = new URLSearchParams();
  const q = query.q.trim();
  if (q) params.set("q", q);
  if (query.type) params.set("type", query.type);
  if (query.sort !== DEFAULT_SORT) params.set("sort", query.sort);
  if (query.favoritesOnly) params.set("favorites", "1");
  if (query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

/** Lower-cases and strips accents/punctuation so "flabebe" matches "Flabébé" and "mr mime" matches "Mr. Mime". */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[♀]/g, " f")
    .replace(/[♂]/g, " m")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Parses "25", "#25" or "#0025" as a Pokédex number. */
export function parseDexNumber(value: string): number | null {
  const match = /^#?\s*0*(\d{1,5})$/.exec(value.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return id > 0 ? id : null;
}

export function matchesSearch(pokemon: PokemonSummary, rawQuery: string): boolean {
  const query = rawQuery.trim();
  if (!query) return true;
  const dex = parseDexNumber(query);
  if (dex !== null) return pokemon.id === dex;
  const needle = normalizeSearch(query);
  if (!needle) return true;
  return normalizeSearch(pokemon.name).includes(needle) || normalizeSearch(pokemon.slug).includes(needle);
}

export function sortPokemon(list: PokemonSummary[], sort: SortOption): PokemonSummary[] {
  const sorted = [...list];
  switch (sort) {
    case "id-asc":
      return sorted.sort((a, b) => a.id - b.id);
    case "id-desc":
      return sorted.sort((a, b) => b.id - a.id);
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "en") || a.id - b.id);
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name, "en") || a.id - b.id);
  }
}

export function filterPokemon(
  list: PokemonSummary[],
  query: Pick<PokedexQuery, "q" | "type" | "favoritesOnly">,
  favoriteIds: ReadonlySet<number> = new Set(),
): PokemonSummary[] {
  return list.filter(
    (p) =>
      (!query.type || p.types.includes(query.type)) &&
      (!query.favoritesOnly || favoriteIds.has(p.id)) &&
      matchesSearch(p, query.q),
  );
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  start: number;
  end: number;
}

/** Slices a page, clamping the requested page into range. `start`/`end` are 1-based and inclusive. */
export function paginate<T>(list: T[], page: number, pageSize: number = PAGE_SIZE): PageResult<T> {
  const total = list.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const offset = (current - 1) * pageSize;
  const items = list.slice(offset, offset + pageSize);
  return {
    items,
    page: current,
    pageCount,
    total,
    start: total === 0 ? 0 : offset + 1,
    end: offset + items.length,
  };
}

/** Page numbers to display, with `null` marking a gap: [1, null, 4, 5, 6, null, 20]. */
export function pageWindow(page: number, pageCount: number, radius = 1): (number | null)[] {
  const pages = new Set<number>([1, pageCount]);
  for (let p = page - radius; p <= page + radius; p++) if (p >= 1 && p <= pageCount) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      // Fill a single missing page rather than showing an ellipsis for it.
      if (sorted[i] - sorted[i - 1] === 2) result.push(sorted[i] - 1);
      else result.push(null);
    }
    result.push(sorted[i]);
  }
  return result;
}

export function runQuery(index: PokemonSummary[], query: PokedexQuery, favoriteIds: ReadonlySet<number>) {
  return paginate(sortPokemon(filterPokemon(index, query, favoriteIds), query.sort), query.page);
}
