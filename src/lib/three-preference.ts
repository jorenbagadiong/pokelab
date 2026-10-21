import { STORAGE_KEYS } from "@/constants/app";
import { createLocalStore } from "@/lib/storage/local-store";

/**
 * Whether the 3D viewer loads automatically. Defaults to "manual" so the
 * three.js bundle and model are only downloaded when the user asks for them.
 */
export type ThreePreference = "auto" | "manual";

export const threePreferenceStore = createLocalStore<ThreePreference>({
  key: STORAGE_KEYS.threeD,
  fallback: "manual",
  parse: (raw) => (raw === "auto" || raw === "manual" ? raw : null),
  serialize: (value) => value,
});
