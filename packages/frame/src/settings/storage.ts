/**
 * Backend for persisting values. The frame defaults to `localStorage`, but an embedding
 * app can supply its own (e.g. a Tauri disk store via `@picoframe/store`, or remote
 * config) through `<AppFrame store={...} />`.
 *
 * `get`/`set` are synchronous — a disk/IPC-backed adapter serves reads from an in-memory
 * cache and persists asynchronously. `hydrate()` loads that cache on boot; `subscribe()`
 * surfaces changes written by another process (e.g. the Rust side) so the UI updates.
 */
export interface PersistentStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  /** Load the backing store into cache. Absent on purely-synchronous adapters. */
  hydrate?(): Promise<void>;
  /** Notify when `key` changes underneath us (e.g. a cross-process write). */
  subscribe?(key: string, listener: () => void): () => void;
}

/** Back-compat alias — settings persist through the same contract. */
export type SettingsStorage = PersistentStorage;

/** Default adapter backed by `localStorage`, tolerant of environments without it. */
export function localStorageAdapter(): SettingsStorage {
  return {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // ignore (private mode, quota, or no localStorage)
      }
    },
  };
}

/** In-memory adapter — handy for tests and non-persistent embeddings. */
export function memoryStorage(): SettingsStorage {
  const data = new Map<string, string>();
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => {
      data.set(key, value);
    },
  };
}
