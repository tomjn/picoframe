/**
 * Backend for persisting settings values. The frame defaults to `localStorage`, but an
 * embedding app can supply its own (e.g. a Tauri store or remote config) via
 * `<AppFrame settingsStorage={...} />` — useful when settings are part of a larger app.
 */
export interface SettingsStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

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
