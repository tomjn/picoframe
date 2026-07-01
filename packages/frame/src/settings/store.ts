import type { PersistentStorage } from "./storage";

/**
 * Serializes settings values over a {@link SettingsStorage} backend and notifies live
 * subscribers when a key changes, so multiple components bound to the same key stay in
 * sync. The React-facing wrapper is `useSetting`.
 */
export interface SettingsStore {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  subscribe(key: string, listener: () => void): () => void;
}

export function createPersistentStore(storage: PersistentStorage): SettingsStore {
  const listeners = new Map<string, Set<() => void>>();

  return {
    get<T>(key: string, fallback: T): T {
      const raw = storage.get(key);
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    set<T>(key: string, value: T): void {
      storage.set(key, JSON.stringify(value));
      const set = listeners.get(key);
      if (set) for (const listener of set) listener();
    },
    subscribe(key: string, listener: () => void): () => void {
      const set = listeners.get(key) ?? new Set();
      set.add(listener);
      listeners.set(key, set);
      // Also receive changes written underneath us (e.g. by the Rust side).
      const unsubStorage = storage.subscribe?.(key, listener);
      return () => {
        set.delete(listener);
        unsubStorage?.();
      };
    },
  };
}

/** Back-compat alias. */
export const createSettingsStore = createPersistentStore;
