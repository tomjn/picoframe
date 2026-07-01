import type { PersistentStorage } from "@picoframe/frame";

/** The subset of a tauri-plugin-store `Store` this adapter depends on. */
export interface RawStore {
  entries(): Promise<[string, unknown][]>;
  set(key: string, value: unknown): Promise<void>;
  onChange(cb: (key: string, value: unknown) => void): Promise<() => void>;
}

/** Values are the JSON strings produced by the store layer; pass them through as-is. */
function asString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Wraps an async `RawStore` behind the synchronous {@link PersistentStorage} contract:
 * reads come from an in-memory cache hydrated on boot, writes go through to the store
 * (which persists on its own debounce), and `onChange` keeps the cache fresh when another
 * process writes. `loader` is separated so the cache logic is testable without Tauri.
 */
export function cachedAdapter(loader: () => Promise<RawStore>): PersistentStorage {
  const cache = new Map<string, string>();
  const listeners = new Map<string, Set<() => void>>();
  let raw: RawStore | null = null;

  const notify = (key: string) => {
    const set = listeners.get(key);
    if (set) for (const l of set) l();
  };

  return {
    get: (key) => cache.get(key) ?? null,
    set: (key, value) => {
      cache.set(key, value);
      void raw?.set(key, value);
      notify(key);
    },
    subscribe: (key, listener) => {
      const set = listeners.get(key) ?? new Set();
      set.add(listener);
      listeners.set(key, set);
      return () => set.delete(listener);
    },
    hydrate: async () => {
      raw = await loader();
      for (const [key, value] of await raw.entries()) {
        const s = asString(value);
        if (s !== null) cache.set(key, s);
      }
      await raw.onChange((key, value) => {
        const s = asString(value);
        if (s === null) cache.delete(key);
        else cache.set(key, s);
        notify(key);
      });
      // Restored values arrived after hooks mounted; nudge them to re-read.
      for (const key of cache.keys()) notify(key);
    },
  };
}
