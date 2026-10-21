import { STORAGE_KEYS } from "@/constants/app";
import { createLocalStore } from "@/lib/storage/local-store";

const EMPTY: readonly number[] = Object.freeze([]);

/** Parses stored favorites, discarding anything that is not a positive integer id. */
export function parseFavorites(raw: string): readonly number[] | null {
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) return null;
  const ids = data.filter((v): v is number => Number.isSafeInteger(v) && v > 0);
  return [...new Set(ids)];
}

export function toggleId(ids: readonly number[], id: number): readonly number[] {
  return ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id];
}

export const favoritesStore = createLocalStore<readonly number[]>({
  key: STORAGE_KEYS.favorites,
  fallback: EMPTY,
  parse: parseFavorites,
  serialize: (ids) => JSON.stringify(ids),
});
