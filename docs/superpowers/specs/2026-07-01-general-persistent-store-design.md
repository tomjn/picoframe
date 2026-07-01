# General disk-backed persistence store — design

Date: 2026-07-01
Target release: `@picoframe/frame` 0.0.10, `@picoframe/store` 0.0.1 (new), `picoframe-core`
crate 0.0.3, `@picoframe/cli` bump. `@picoframe/plugin-sdk` unchanged.

## Problem

An app built on picoframe reached into **one plugin's** disk-storage mechanism to persist
its own settings and "other options" (e.g. remembering a form's state across navigation).
That couples the app and other plugins to that single plugin. We want a **general-purpose,
disk-backed key-value store owned by picoframe**, reachable from **both** the JS (React
plugins) and Rust (plugin backends) sides — because you cannot know in advance which side
needs a given piece of state — so nobody has to borrow another plugin's store.

`localStorage` is explicitly not the answer: it is browser-only and not shared with the
backend.

## What already exists

The frame's settings feature already ships a generic, namespaced-by-convention KV store:

- `SettingsStorage` (`packages/frame/src/settings/storage.ts`) — `get(key): string | null` /
  `set(key, value): void`, with `localStorageAdapter()` and `memoryStorage()`.
- `createSettingsStore` (`store.ts`) — wraps a `SettingsStorage` with JSON (de)serialization
  and a per-key pub/sub so components bound to the same key stay in sync.
- `useSetting<T>(key, default)` (`SettingsStoreProvider.tsx`) — the React hook.
- `AppFrame` accepts `settingsStorage?: SettingsStorage` (default `localStorageAdapter()`).

It is missing four things to be the general mechanism:

1. A **disk-backed implementation** both JS and Rust can open (only localStorage/memory exist).
2. A **sync → async bridge** (disk/IPC is async; `useSetting` reads synchronously).
3. A **Rust-side access convention** so plugin backends hit the same file without hardcoding.
4. **Default wiring** so an app gets it for free instead of borrowing a plugin's store.

## Decisions taken during brainstorming

- **Adopt the official `tauri-plugin-store`** (npm `@tauri-apps/plugin-store`, crate
  `tauri-plugin-store`) rather than hand-rolling disk IO. It is disk-backed JSON KV with both
  a JS and a Rust API pointing at the same files — exactly the "either side can read it"
  property required.
- **Unify:** the general store is the substrate; settings become a thin wrapper over it, so
  there is only one persistence concept. Settings gain disk-backing + backend access for free.
- **The frame stays Tauri-free.** The Tauri adapter lives in a new package injected at the
  app level (same seam as today's `settingsStorage` prop). `@picoframe/frame` currently has
  zero `@tauri-apps/*` dependencies and must keep it that way.
- **Single shared store file** (`picoframe.json`) with namespaced keys, not file-per-plugin.

## Verified upstream API (tauri-plugin-store, v2)

- JS import `"@tauri-apps/plugin-store"`: `load(path, options?): Promise<Store>`;
  `store.get<T>(key)`, `store.set(key, value)`, `store.save()`;
  `store.onChange<T>(cb): Promise<UnlistenFn>`, `store.onKeyChange<T>(key, cb)`.
  `StoreOptions.autoSave: boolean | number` (default 100ms debounce; `false` disables).
- Rust `use tauri_plugin_store::StoreExt;` → `app.store("store.json")?`; `store.set(...)`,
  `store.get(...)`, `store.save()`. Registered with
  `.plugin(tauri_plugin_store::Builder::default().build())`.
- Capability permission identifier: `"store:default"`.
- Exact Rust return type of `app.store(...)` (`Arc<Store<R>>` vs. handle) must be confirmed
  against the installed crate version when implementing the `picoframe-core` helper.

---

## Component 1 — the contract (`@picoframe/frame`, Tauri-free)

`packages/frame/src/settings/storage.ts`: generalize `SettingsStorage` into
`PersistentStorage`, adding two **optional** async-aware members so existing sync adapters
(`localStorageAdapter`, `memoryStorage`) remain valid unchanged.

```ts
export interface PersistentStorage {
  /** Synchronous read from the in-memory cache. */
  get(key: string): string | null;
  /** Write-through: update cache and persist. */
  set(key: string, value: string): void;
  /** Load the backing store into cache on boot. Absent for purely-sync adapters. */
  hydrate?(): Promise<void>;
  /** Storage-level change feed, e.g. a value written by another process. */
  subscribe?(key: string, cb: () => void): () => void;
}

/** Back-compat alias. */
export type SettingsStorage = PersistentStorage;
```

`localStorageAdapter()` and `memoryStorage()` are unchanged (they implement only `get`/`set`).

## Component 2 — the store wrapper (`@picoframe/frame`)

`packages/frame/src/settings/store.ts`: rename `createSettingsStore` →
`createPersistentStore` (keep `createSettingsStore` as an alias export). Behaviour additions:

- On construction, if `storage.subscribe` exists, forward storage-level key changes into the
  existing per-key listener set, so a value written by the Rust side (surfaced via the
  adapter's `store.onChange`) notifies React subscribers.
- `get`/`set`/`subscribe` semantics otherwise unchanged (JSON (de)serialize + pub/sub).

## Component 3 — hooks & provider (`@picoframe/frame`)

`SettingsStoreProvider.tsx`:

- Rename `SettingsStoreProvider` → `PersistentStoreProvider` (keep old name as alias export).
- On mount, call `storage.hydrate?.()` in an effect. When it resolves, the store fires a
  change for hydrated keys so mounted hooks re-read and restored values pop in. **No
  app-render gating** — a form draft may show its default for a frame before the restored
  value arrives, which is acceptable and matches the existing subscribe-on-mount pattern.
- `usePersistentValue<T>(key, default): [T, (v: T) => void]` — the general, primary hook.
- `useSetting` is re-exported as the same function (settings-UI ergonomics preserved).
- Keys stay caller-namespaced by convention (`"hello.formDraft"`, `"recoil.engine.vsync"`).
  That convention is the per-plugin collision isolation — unchanged from today.

`AppFrame` (`AppFrame.tsx`):

- Add `store?: PersistentStorage`; keep `settingsStorage?` as a deprecated alias (if both are
  supplied, `store` wins). Default remains `localStorageAdapter()` so non-Tauri usage works.
- Pass the resolved storage to `PersistentStoreProvider`.

## Component 4 — the disk adapter (`@picoframe/store`, new package)

New workspace package `packages/store` → `@picoframe/store`. The **only** Tauri-coupled JS
piece. Depends on `@tauri-apps/plugin-store` and `@tauri-apps/api`; peer-depends on
`@picoframe/frame` for the `PersistentStorage` type.

```ts
export function createTauriStore(opts?: {
  path?: string;                 // default "picoframe.json" (app_data_dir)
  autoSave?: boolean | number;   // default 100 (ms debounce)
  fallback?: "localStorage" | "memory"; // when not under Tauri; default "localStorage"
}): PersistentStorage;
```

Internals:

- If Tauri is absent (`!("__TAURI_INTERNALS__" in globalThis)`), return the configured
  fallback adapter (`localStorageAdapter()` / `memoryStorage()` from `@picoframe/frame`) so
  browser dev still works with identical app code.
- Otherwise hold an in-memory `Map<string, string>` cache.
  - `hydrate()`: `load(path, { autoSave })`, read all existing entries into the cache, and
    register `store.onChange((key, value) => { refresh cache; notify subscribers })` so
    cross-process (Rust-written) changes reach the UI.
  - `get(key)`: return the cached string (or `null`).
  - `set(key, value)`: update cache, `store.set(key, value)` (autoSave persists), notify.
  - `subscribe(key, cb)`: register `cb` against the key; invoked on `onChange` refresh.
- Values are the JSON strings produced by `createPersistentStore` (the store layer
  `JSON.stringify`s before calling `set`), stored as string values in the Tauri store.

## Component 5 — Rust symmetry (`picoframe-core`)

`crates/picoframe-core/src/lib.rs`: add a helper so plugin backends hit the same file without
hardcoding it. Adds `tauri-plugin-store = "2"` to the crate's dependencies.

```rust
pub const STORE_PATH: &str = "picoframe.json";

/// Namespaced by convention: callers use keys like "hello.formDraft".
pub fn store<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<…> {
    use tauri_plugin_store::StoreExt;
    app.store(STORE_PATH)
}
```

(Exact return type confirmed against the installed crate version at implementation time.)
This ends the "borrow another plugin's disk store" coupling on the backend side.

## Component 6 — default wiring (`@picoframe/cli` app template)

- `templates/app/src-tauri/Cargo.toml`: add `tauri-plugin-store = "2"`.
- `templates/app/src-tauri/src/main.rs`: add
  `.plugin(tauri_plugin_store::Builder::default().build())` (before the
  `picoframe:plugins-start` marker block).
- `templates/app/src-tauri/capabilities/default.json`: add `"store:default"` to
  `permissions`.
- `templates/app/package.json`: add `@tauri-apps/plugin-store` and `@picoframe/store`.
- `templates/app/src/main.tsx`:
  `import { createTauriStore } from "@picoframe/store";` and
  `<AppFrame plugins={plugins} store={createTauriStore()} title="{{APP_NAME}}" />`.

The demo app (`apps/demo`) receives the same wiring (its `Cargo.toml`, `main.rs`,
`capabilities/default.json`, `package.json`, `main.tsx`).

## Component 7 — demo

Extend the demo-local plugin (`apps/demo/src/demo-extras.tsx`) to demonstrate the intended
use: a form whose draft state persists across navigation via `usePersistentValue`. Navigate
away and back; the draft is restored from disk.

## Testing

Pure-logic `bun:test`, matching the repo (no DOM harness):

- `createPersistentStore` — storage-level `subscribe` → per-key notify, and hydrate-then-read,
  driven by a mock `PersistentStorage` that implements `hydrate`/`subscribe`. Existing
  `store.test.ts` must stay green.
- `@picoframe/store` — the cache / fallback / namespacing logic tested by injecting a fake
  `load` (so no real Tauri needed). The **real IPC path is demo-verified** — there is no Tauri
  test harness in-repo, and adding one is out of scope. This is stated plainly rather than
  implied as covered.

## Versioning & build order

- `@picoframe/frame` → **0.0.10** (generalized contract, `usePersistentValue`, `store` prop).
- `@picoframe/store` → **0.0.1** (new package).
- `picoframe-core` crate → **0.0.3** (`store()` helper + `tauri-plugin-store` dep).
- `@picoframe/cli` → bump (template changes).
- `@picoframe/plugin-sdk` → unchanged.
- Build order: `plugin-sdk` → `frame` → `store`. Demo/template consume via `workspace:*`.

## Non-goals (this release)

- Encryption at rest.
- Migration of existing localStorage settings into the disk store.
- Multiple / isolated store files (single shared `picoframe.json`; additional named stores can
  come later).
- Schema validation or typed key registries.
- Remote sync.
