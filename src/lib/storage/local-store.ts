/**
 * A tiny external store backed by localStorage, designed for
 * `useSyncExternalStore`:
 *
 * - Never touches `window` during server rendering (`getServerSnapshot`
 *   returns the fallback, so hydration matches the server HTML).
 * - Caches the parsed snapshot so React receives a stable reference.
 * - Survives unavailable or throwing storage (private mode, quotas, blocked
 *   cookies) by keeping the value in memory.
 * - Syncs across tabs via the `storage` event.
 */
export interface LocalStore<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
  getServerSnapshot: () => T;
}

export interface LocalStoreOptions<T> {
  key: string;
  fallback: T;
  /** Converts a stored string into a value; return `null` to reject invalid data. */
  parse: (raw: string) => T | null;
  serialize: (value: T) => string;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function createLocalStore<T>({ key, fallback, parse, serialize }: LocalStoreOptions<T>): LocalStore<T> {
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } | null = null;
  let memoryValue: T | null = null;

  function read(): T {
    const store = storage();
    let raw: string | null = null;
    try {
      raw = store?.getItem(key) ?? null;
    } catch {
      raw = null;
    }
    if (raw === null && memoryValue !== null) return memoryValue;
    if (cache && cache.raw === raw) return cache.value;

    let value = fallback;
    if (raw !== null) {
      try {
        value = parse(raw) ?? fallback;
      } catch {
        value = fallback;
      }
    }
    cache = { raw, value };
    return value;
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  function onStorage(event: StorageEvent) {
    if (event.key === key || event.key === null) emit();
  }

  return {
    get: read,
    getServerSnapshot: () => fallback,
    set(next) {
      const value = typeof next === "function" ? (next as (prev: T) => T)(read()) : next;
      const raw = serialize(value);
      try {
        const store = storage();
        if (!store) throw new Error("storage unavailable");
        store.setItem(key, raw);
        memoryValue = null;
      } catch {
        memoryValue = value; // keep working for this session even if persistence fails
      }
      cache = { raw, value };
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1 && typeof window !== "undefined") window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },
  };
}
