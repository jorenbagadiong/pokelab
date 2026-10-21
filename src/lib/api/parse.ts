import { ApiParseError } from "./errors";

/**
 * Minimal runtime validation helpers. Required fields throw `ApiParseError`;
 * `opt*` helpers return `null` for missing or wrongly-typed optional values.
 */

export type Json = Record<string, unknown>;

export function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function obj(value: unknown, path: string): Json {
  if (!isRecord(value)) throw new ApiParseError(path, "object");
  return value;
}

export function str(value: unknown, path: string): string {
  if (typeof value !== "string") throw new ApiParseError(path, "string");
  return value;
}

export function num(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new ApiParseError(path, "number");
  return value;
}

export function arr(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new ApiParseError(path, "array");
  return value;
}

export function optStr(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function optNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function optBool(value: unknown): boolean {
  return value === true;
}

export function optArr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function optObj(value: unknown): Json | null {
  return isRecord(value) ? value : null;
}

/** A PokéAPI `NamedAPIResource` ({ name, url }). */
export interface NamedResource {
  name: string;
  url: string;
}

export function named(value: unknown, path: string): NamedResource {
  const o = obj(value, path);
  return { name: str(o.name, `${path}.name`), url: str(o.url, `${path}.url`) };
}

export function optNamed(value: unknown): NamedResource | null {
  if (!isRecord(value)) return null;
  const name = optStr(value.name);
  const url = optStr(value.url);
  return name && url ? { name, url } : null;
}

/** Reads only the `name` of a `NamedAPIResource`, for fields where the URL is not needed. */
export function nameOf(value: unknown): string | null {
  return isRecord(value) ? optStr(value.name) : null;
}

/** Extracts the trailing numeric id from a PokéAPI resource URL. */
export function idFromUrl(url: string): number | null {
  const match = /\/(\d+)\/?$/.exec(url);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Picks the English entry from a localized list such as `names` or `genera`. */
export function englishEntry(list: unknown, field: string): string | null {
  for (const entry of optArr(list)) {
    if (!isRecord(entry)) continue;
    if (nameOf(entry.language) === "en") {
      const text = optStr(entry[field]);
      if (text) return text;
    }
  }
  return null;
}
