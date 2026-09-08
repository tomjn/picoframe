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
  /**
   * Listen for a write to any key, and read the counter each write bumps.
   *
   * For a reader that cannot name its keys ahead of time. The breadcrumb is the one
   * that made this necessary: a route's `crumb` function is a plain function the top
   * bar calls while it renders, so the frame cannot see which values it read, only
   * that it read something. Pair the two as a `useSyncExternalStore` source.
   */
  subscribeAny(listener: () => void): () => void;
  /** Bumped by every write this store can see. Only equality across calls means anything. */
  revision(): number;
}

export function createPersistentStore(storage: PersistentStorage): SettingsStore {
  const listeners = new Map<string, Set<() => void>>();
  const anyListeners = new Set<() => void>();
  let revision = 0;

  const bump = () => {
    revision += 1;
    for (const listener of anyListeners) listener();
  };

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
      bump();
    },
    subscribe(key: string, listener: () => void): () => void {
      const set = listeners.get(key) ?? new Set();
      set.add(listener);
      listeners.set(key, set);
      // Also receive changes written underneath us (e.g. by the Rust side). A storage
      // backend has no wildcard subscription, so an outside write only reaches the
      // any-listeners for a key something is already bound to.
      const unsubStorage = storage.subscribe?.(key, () => {
        listener();
        bump();
      });
      return () => {
        set.delete(listener);
        unsubStorage?.();
      };
    },
    subscribeAny(listener: () => void): () => void {
      anyListeners.add(listener);
      return () => {
        anyListeners.delete(listener);
      };
    },
    revision(): number {
      return revision;
    },
  };
}

/** Back-compat alias. */
export const createSettingsStore = createPersistentStore;
