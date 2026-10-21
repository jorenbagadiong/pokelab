import { SPRITES_BASE_URL } from "@/constants/app";

/**
 * Official-artwork URL in the PokeAPI sprites repository. Used only where a
 * PokéAPI resource URL is not available (e.g. list cards, which are built from
 * the lightweight index). Callers must still handle the image failing to load.
 */
export function officialArtworkUrl(id: number): string {
  return `${SPRITES_BASE_URL}/other/official-artwork/${id}.png`;
}

/** Returns the first usable URL, or `null` when none is available. */
export function pickImage(...candidates: (string | null | undefined)[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return null;
}
