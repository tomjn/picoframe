import { localStorageAdapter, memoryStorage, type PersistentStorage } from "@picoframe/frame";
import { load } from "@tauri-apps/plugin-store";
import { cachedAdapter, type RawStore } from "./cachedAdapter";

export interface TauriStoreOptions {
  /** Store file in the app data dir. Default `"picoframe.json"`. */
  path?: string;
  /** Auto-save debounce (ms) or `false` to disable. Default `100` (plugin default). */
  autoSave?: boolean | number;
  /** Adapter to use when not running under Tauri (e.g. browser dev). Default localStorage. */
  fallback?: "localStorage" | "memory";
}

function underTauri(): boolean {
  return typeof globalThis !== "undefined" && "__TAURI_INTERNALS__" in globalThis;
}

/**
 * A {@link PersistentStorage} backed by the official `tauri-plugin-store` — a single
 * disk file both the JS and Rust sides can read. Off Tauri (browser dev) it falls back to
 * `localStorage` (or `memory`) so the same app code runs unchanged.
 */
export function createTauriStore(opts: TauriStoreOptions = {}): PersistentStorage {
  if (!underTauri()) {
    return opts.fallback === "memory" ? memoryStorage() : localStorageAdapter();
  }
  const path = opts.path ?? "picoframe.json";
  const autoSave = opts.autoSave ?? 100;
  return cachedAdapter(async () => {
    // `load` returns the plugin `Store`; it satisfies the RawStore subset we use.
    // `defaults` is required by StoreOptions; {} means "no seed values" (existing
    // on-disk state still loads, and missing keys simply stay absent).
    return (await load(path, { autoSave, defaults: {} })) as unknown as RawStore;
  });
}
