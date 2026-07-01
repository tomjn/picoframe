# General Disk-Backed Persistence Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give picoframe a general-purpose, disk-backed key-value store owned by the frame and reachable from both the JS (React) and Rust (plugin backend) sides, so apps and plugins stop borrowing one plugin's private disk storage.

**Architecture:** Generalize the frame's existing sync `SettingsStorage` contract into `PersistentStorage` (adds optional async `hydrate()` and cross-process `subscribe()`). The disk implementation lives in a new Tauri-coupled package `@picoframe/store` that wraps the official `tauri-plugin-store` behind an in-memory cache (fast sync reads, async write-through, `onChange` propagation of backend writes). `useSetting` becomes the "settings" ergonomic name over the same store, alongside a general `usePersistentValue`. Rust plugin halves reach the same file via a `picoframe-core::store()` helper. The CLI app template and demo wire it by default.

**Tech Stack:** TypeScript, React 19, `bun:test`, Tauri v2, `@tauri-apps/plugin-store` / `tauri-plugin-store` crate, Rust.

**Verified upstream API (tauri-plugin-store v2):**
- JS `"@tauri-apps/plugin-store"`: `load(path, options?): Promise<Store>`; `store.set(key, value)`, `store.get<T>(key)`, `store.save()`, `store.entries(): Promise<[string, T][]>`, `store.onChange<T>(cb): Promise<UnlistenFn>`. `StoreOptions.autoSave: boolean | number` (default 100ms).
- Rust `use tauri_plugin_store::StoreExt;` → `app.store("store.json")` returns `Result<Arc<Store<R>>>`; `store.set`, `store.get`, `store.save`. Register with `.plugin(tauri_plugin_store::Builder::default().build())`.
- Capability permission: `"store:default"`.

**Conventions in this repo:**
- Keys are namespaced by the caller by convention (e.g. `"demo.general.displayName"`). This is unchanged and is the per-plugin collision isolation.
- Pure-logic tests only (`bun:test`); no DOM/React test harness exists. React-only code is verified by `bun run typecheck` and running the demo.
- Separate `git add` per file (no `git add -A`). No emoji in commits.

---

## File structure

**Modified (frame, Tauri-free):**
- `packages/frame/src/settings/storage.ts` — `PersistentStorage` contract + `SettingsStorage` alias + optional `hydrate`/`subscribe`.
- `packages/frame/src/settings/store.ts` — rename `createSettingsStore` → `createPersistentStore` (keep alias); forward `storage.subscribe` into per-key listeners.
- `packages/frame/src/settings/SettingsStoreProvider.tsx` — rename provider (keep alias), hydrate effect, add `usePersistentValue`, keep `useSetting` alias.
- `packages/frame/src/AppFrame.tsx` — add `store?` prop (keep `settingsStorage?` alias).
- `packages/frame/src/index.ts` — export the generalized surface.
- `packages/frame/package.json` — version bump to 0.0.10.

**Created (new package, the only Tauri-coupled JS):**
- `packages/store/package.json`, `tsconfig.json`, `tsconfig.build.json`
- `packages/store/src/cachedAdapter.ts` — pure cache-over-RawStore logic (unit-tested).
- `packages/store/src/cachedAdapter.test.ts`
- `packages/store/src/tauriStore.ts` — `createTauriStore()` (Tauri detection + `load`).
- `packages/store/src/index.ts`

**Modified (Rust):**
- `crates/picoframe-core/src/lib.rs` — `STORE_PATH` const + `store()` helper.
- `crates/picoframe-core/Cargo.toml` — add `tauri-plugin-store`; version 0.0.3.
- `Cargo.toml` (workspace) — add `tauri-plugin-store` workspace dep; bump `picoframe-core` dep version.

**Modified (wiring):**
- Root `tsconfig.json` — path + include for `@picoframe/store`.
- Root `package.json` — build script includes `packages/store`.
- CLI template: `packages/cli/templates/app/{package.json, src/main.tsx, src-tauri/Cargo.toml, src-tauri/src/main.rs, src-tauri/capabilities/default.json}`.
- Demo: `apps/demo/{package.json, src/main.tsx, src/demo-extras.tsx, src-tauri/Cargo.toml, src-tauri/src/main.rs, src-tauri/capabilities/default.json}`.

---

## Task 1: Generalize the storage contract

**Files:**
- Modify: `packages/frame/src/settings/storage.ts`

- [ ] **Step 1: Rewrite the contract, keeping adapters and adding optional async members**

Replace the interface block at the top of `packages/frame/src/settings/storage.ts` (lines 1-9) with:

```ts
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
```

Leave `localStorageAdapter()` and `memoryStorage()` (lines 11-40) unchanged.

- [ ] **Step 2: Verify the workspace still type-checks**

Run: `bun run typecheck`
Expected: PASS (optional members are additive; existing `SettingsStorage` importers still compile via the alias).

- [ ] **Step 3: Commit**

```bash
git add packages/frame/src/settings/storage.ts
git commit -m "frame: generalize SettingsStorage into PersistentStorage"
```

---

## Task 2: Forward storage-level changes in the store wrapper

**Files:**
- Modify: `packages/frame/src/settings/store.ts`
- Test: `packages/frame/src/settings/store.test.ts`

- [ ] **Step 1: Add a failing test for storage-level subscribe forwarding**

Append to `packages/frame/src/settings/store.test.ts`:

```ts
import { createPersistentStore } from "./store";

test("createSettingsStore is an alias of createPersistentStore", () => {
  expect(createSettingsStore).toBe(createPersistentStore);
});

test("a storage-level change notifies the key's subscribers", () => {
  const data = new Map<string, string>();
  const storageListeners = new Map<string, Set<() => void>>();
  const storage = {
    get: (k: string) => data.get(k) ?? null,
    set: (k: string, v: string) => {
      data.set(k, v);
    },
    subscribe(key: string, listener: () => void) {
      const set = storageListeners.get(key) ?? new Set();
      set.add(listener);
      storageListeners.set(key, set);
      return () => set.delete(listener);
    },
  };
  const store = createPersistentStore(storage);
  let calls = 0;
  const unsub = store.subscribe("k", () => calls++);

  // Simulate a cross-process write arriving through the storage adapter.
  for (const l of storageListeners.get("k") ?? []) l();
  expect(calls).toBe(1);

  // After unsubscribe, storage-level changes no longer reach the listener.
  unsub();
  expect(storageListeners.get("k")?.size ?? 0).toBe(0);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `bun test packages/frame/src/settings/store.test.ts`
Expected: FAIL — `createPersistentStore` is not exported yet.

- [ ] **Step 3: Rename the factory and forward storage subscriptions**

In `packages/frame/src/settings/store.ts`, change the import and factory. Replace `import type { SettingsStorage } from "./storage";` with:

```ts
import type { PersistentStorage } from "./storage";
```

Rename the exported function and add the alias + subscribe forwarding. Replace the `export function createSettingsStore(...) { ... }` block (lines 14-41) with:

```ts
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
```

Leave the `SettingsStore` interface (lines 3-12) unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/frame/src/settings/store.test.ts`
Expected: PASS (all existing tests plus the two new ones).

- [ ] **Step 5: Commit**

```bash
git add packages/frame/src/settings/store.ts packages/frame/src/settings/store.test.ts
git commit -m "frame: forward storage-level changes into the persistent store"
```

---

## Task 3: Hydrate on mount + add usePersistentValue

**Files:**
- Modify: `packages/frame/src/settings/SettingsStoreProvider.tsx`

- [ ] **Step 1: Rewrite the provider/hooks**

Replace the whole file `packages/frame/src/settings/SettingsStoreProvider.tsx` with:

```tsx
"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { type PersistentStorage, localStorageAdapter } from "./storage";
import { type SettingsStore, createPersistentStore } from "./store";

const PersistentStoreContext = createContext<SettingsStore | null>(null);

export function PersistentStoreProvider({
  storage,
  children,
}: {
  storage?: PersistentStorage;
  children: ReactNode;
}) {
  const [store] = useState(() => createPersistentStore(storage ?? localStorageAdapter()));

  // Disk/IPC-backed adapters load asynchronously. Hydrate once; when it resolves the
  // adapter fires per-key changes so mounted hooks re-read and restored values appear.
  useEffect(() => {
    storage?.hydrate?.();
  }, [storage]);

  return <PersistentStoreContext.Provider value={store}>{children}</PersistentStoreContext.Provider>;
}

/** Back-compat alias. */
export const SettingsStoreProvider = PersistentStoreProvider;

/**
 * Read/write a persisted value. Frame-managed and reactive: components bound to the same
 * `key` stay in sync, the value persists via the configured `store`, and a value written
 * by another process (e.g. the Rust side) updates live. Namespace `key` yourself, e.g.
 * `"myPlugin.formDraft"`.
 */
export function usePersistentValue<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const store = useContext(PersistentStoreContext);
  if (!store) throw new Error("usePersistentValue must be used within <AppFrame>");

  const [value, setValue] = useState<T>(() => store.get(key, defaultValue));

  useEffect(() => {
    setValue(store.get(key, defaultValue));
    return store.subscribe(key, () => setValue(store.get(key, defaultValue)));
    // `defaultValue` is a seed read on (re)subscribe, not a reactive dependency.
    // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  }, [store, key]);

  const set = useCallback((next: T) => store.set(key, next), [store, key]);
  return [value, set];
}

/** Settings-flavoured name for {@link usePersistentValue}; identical behaviour. */
export const useSetting = usePersistentValue;
```

- [ ] **Step 2: Verify the workspace type-checks**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 3: Run the frame test suite (nothing should regress)**

Run: `bun test packages/frame`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/frame/src/settings/SettingsStoreProvider.tsx
git commit -m "frame: hydrate persistent store on mount, add usePersistentValue"
```

---

## Task 4: Wire the store prop and exports through AppFrame

**Files:**
- Modify: `packages/frame/src/AppFrame.tsx`
- Modify: `packages/frame/src/index.ts`

- [ ] **Step 1: Add the `store` prop (keep `settingsStorage` as a deprecated alias)**

In `packages/frame/src/AppFrame.tsx`:

Change the import on line 14 and 16 from:

```ts
import { SettingsStoreProvider } from "./settings/SettingsStoreProvider";
```
```ts
import type { SettingsStorage } from "./settings/storage";
```
to:

```ts
import { PersistentStoreProvider } from "./settings/SettingsStoreProvider";
```
```ts
import type { PersistentStorage } from "./settings/storage";
```

Replace the `settingsStorage?` prop doc + field (lines 33-38) with:

```ts
  /**
   * Backend for persisting values (`useSetting` / `usePersistentValue`). Defaults to
   * `localStorage`; supply a disk-backed adapter (e.g. `createTauriStore()` from
   * `@picoframe/store`) to persist to disk and share state with the Rust side.
   */
  store?: PersistentStorage;
  /** @deprecated Use `store`. */
  settingsStorage?: PersistentStorage;
```

Add `store` and `settingsStorage` to the destructured params (replace line 52 `settingsStorage,`):

```ts
  store,
  settingsStorage,
```

Replace the provider usage on line 98 `<SettingsStoreProvider storage={settingsStorage}>` with:

```tsx
            <PersistentStoreProvider storage={store ?? settingsStorage}>
```

And its closing tag on line 106 `</SettingsStoreProvider>` with:

```tsx
            </PersistentStoreProvider>
```

- [ ] **Step 2: Export the generalized surface**

In `packages/frame/src/index.ts`, replace the settings export block (lines 22-24):

```ts
// Settings: read/write persisted settings, and supply a custom storage backend.
export { useSetting } from "./settings/SettingsStoreProvider";
export { localStorageAdapter, memoryStorage, type SettingsStorage } from "./settings/storage";
```

with:

```ts
// Persistence: read/write persisted values, and supply a custom storage backend.
// `useSetting` is the settings-flavoured alias of `usePersistentValue`.
export {
  usePersistentValue,
  useSetting,
  PersistentStoreProvider,
} from "./settings/SettingsStoreProvider";
export {
  localStorageAdapter,
  memoryStorage,
  type PersistentStorage,
  type SettingsStorage,
} from "./settings/storage";
```

- [ ] **Step 3: Verify type-check**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/frame/src/AppFrame.tsx packages/frame/src/index.ts
git commit -m "frame: add AppFrame store prop and export the persistence surface"
```

---

## Task 5: Scaffold the `@picoframe/store` package

**Files:**
- Create: `packages/store/package.json`
- Create: `packages/store/tsconfig.json`
- Create: `packages/store/tsconfig.build.json`
- Create: `packages/store/src/index.ts`
- Modify: `tsconfig.json` (root)
- Modify: `package.json` (root)

- [ ] **Step 1: Create `packages/store/package.json`**

```json
{
  "name": "@picoframe/store",
  "version": "0.0.1",
  "description": "Disk-backed persistence adapter for picoframe, built on tauri-plugin-store",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/tomjn/picoframe.git",
    "directory": "packages/store"
  },
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json"
  },
  "dependencies": {
    "@tauri-apps/plugin-store": "^2.2.0"
  },
  "peerDependencies": {
    "@picoframe/frame": "*"
  }
}
```

- [ ] **Step 2: Create `packages/store/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/store/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["**/*.test.ts", "**/*.test.tsx"]
}
```

- [ ] **Step 4: Create `packages/store/src/index.ts` (placeholder, filled by later tasks)**

```ts
export {};
```

- [ ] **Step 5: Register the package in the root `tsconfig.json`**

In root `tsconfig.json`, add to `compilerOptions.paths` (after the `@picoframe/frame` line):

```json
      "@picoframe/store": ["./packages/store/src/index.ts"],
```

and add to `include` (after `"packages/frame/src",`):

```json
    "packages/store/src",
```

- [ ] **Step 6: Add the package to the root build script**

In root `package.json`, replace the `build` script value:

```json
    "build": "bun run --cwd packages/plugin-sdk build && bun run --cwd packages/frame build && bun run --cwd packages/store build && bun run --cwd plugins/hello build",
```

- [ ] **Step 7: Install so bun links the new workspace package**

Run: `bun install`
Expected: completes; `@picoframe/store` and `@tauri-apps/plugin-store` resolved.

- [ ] **Step 8: Verify type-check**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/store/package.json packages/store/tsconfig.json packages/store/tsconfig.build.json packages/store/src/index.ts tsconfig.json package.json
git commit -m "store: scaffold @picoframe/store package"
```

---

## Task 6: Pure cache-over-RawStore adapter (TDD)

**Files:**
- Create: `packages/store/src/cachedAdapter.ts`
- Test: `packages/store/src/cachedAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/store/src/cachedAdapter.test.ts`:

```ts
import { expect, test } from "bun:test";
import { cachedAdapter, type RawStore } from "./cachedAdapter";

/** In-memory RawStore double capturing an onChange callback we can fire manually. */
function fakeStore(initial: Record<string, unknown> = {}) {
  const data = new Map<string, unknown>(Object.entries(initial));
  let onChangeCb: ((key: string, value: unknown) => void) | null = null;
  const raw: RawStore = {
    entries: async () => [...data.entries()],
    set: async (k, v) => {
      data.set(k, v);
    },
    onChange: async (cb) => {
      onChangeCb = cb;
      return () => {
        onChangeCb = null;
      };
    },
  };
  return { raw, fire: (k: string, v: unknown) => onChangeCb?.(k, v), data };
}

test("get returns null before hydrate", () => {
  const { raw } = fakeStore({ a: '"x"' });
  const adapter = cachedAdapter(async () => raw);
  expect(adapter.get("a")).toBeNull();
});

test("hydrate loads existing entries into the cache", async () => {
  const { raw } = fakeStore({ a: '"x"', b: "1" });
  const adapter = cachedAdapter(async () => raw);
  await adapter.hydrate!();
  expect(adapter.get("a")).toBe('"x"');
  expect(adapter.get("b")).toBe("1");
});

test("set writes through to the raw store and updates the cache", async () => {
  const { raw, data } = fakeStore();
  const adapter = cachedAdapter(async () => raw);
  await adapter.hydrate!();
  adapter.set("k", '"v"');
  expect(adapter.get("k")).toBe('"v"');
  expect(data.get("k")).toBe('"v"');
});

test("a cross-process onChange updates the cache and notifies subscribers", async () => {
  const { raw, fire } = fakeStore();
  const adapter = cachedAdapter(async () => raw);
  await adapter.hydrate!();
  let calls = 0;
  adapter.subscribe!("k", () => calls++);
  fire("k", "42"); // value already a JSON string
  expect(adapter.get("k")).toBe("42");
  expect(calls).toBe(1);
});

test("onChange with an undefined value deletes the cached key", async () => {
  const { raw, fire } = fakeStore({ k: '"v"' });
  const adapter = cachedAdapter(async () => raw);
  await adapter.hydrate!();
  fire("k", undefined);
  expect(adapter.get("k")).toBeNull();
});

test("hydrate notifies subscribers so mounted readers re-read", async () => {
  const { raw } = fakeStore({ k: '"restored"' });
  const adapter = cachedAdapter(async () => raw);
  let calls = 0;
  adapter.subscribe!("k", () => calls++);
  await adapter.hydrate!();
  expect(calls).toBe(1);
  expect(adapter.get("k")).toBe('"restored"');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/store/src/cachedAdapter.test.ts`
Expected: FAIL — `cachedAdapter` not found.

- [ ] **Step 3: Implement `packages/store/src/cachedAdapter.ts`**

```ts
import type { PersistentStorage } from "@picoframe/frame";

/** The subset of a tauri-plugin-store `Store` this adapter depends on. */
export interface RawStore {
  entries<T = unknown>(): Promise<[string, T][]>;
  set(key: string, value: unknown): Promise<void>;
  onChange<T = unknown>(cb: (key: string, value: T | undefined) => void): Promise<() => void>;
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test packages/store/src/cachedAdapter.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/store/src/cachedAdapter.ts packages/store/src/cachedAdapter.test.ts
git commit -m "store: cache-over-RawStore adapter with cross-process change propagation"
```

---

## Task 7: `createTauriStore()` and package exports

**Files:**
- Create: `packages/store/src/tauriStore.ts`
- Modify: `packages/store/src/index.ts`

- [ ] **Step 1: Implement `packages/store/src/tauriStore.ts`**

```ts
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
    return (await load(path, { autoSave })) as unknown as RawStore;
  });
}
```

- [ ] **Step 2: Replace `packages/store/src/index.ts`**

```ts
export { createTauriStore, type TauriStoreOptions } from "./tauriStore";
export { cachedAdapter, type RawStore } from "./cachedAdapter";
```

- [ ] **Step 3: Verify type-check and tests**

Run: `bun run typecheck`
Expected: PASS.

Run: `bun test packages/store`
Expected: PASS.

- [ ] **Step 4: Verify the package builds to `dist/`**

Run: `bun run --cwd packages/store build`
Expected: PASS; `packages/store/dist/index.js` and `.d.ts` produced.

- [ ] **Step 5: Commit**

```bash
git add packages/store/src/tauriStore.ts packages/store/src/index.ts
git commit -m "store: add createTauriStore with off-Tauri localStorage fallback"
```

---

## Task 8: Rust `store()` helper in picoframe-core

**Files:**
- Modify: `Cargo.toml` (workspace)
- Modify: `crates/picoframe-core/Cargo.toml`
- Modify: `crates/picoframe-core/src/lib.rs`

- [ ] **Step 1: Add `tauri-plugin-store` to the workspace dependencies**

In root `Cargo.toml`, under `[workspace.dependencies]`, add after the `tauri-plugin-opener` line:

```toml
tauri-plugin-store = { version = "2" }
```

- [ ] **Step 2: Depend on it from picoframe-core and bump the crate version**

In `crates/picoframe-core/Cargo.toml`, change `version = "0.0.2"` (line 3) to:

```toml
version = "0.0.3"
```

and add under `[dependencies]` (after the `serde_json` line):

```toml
tauri-plugin-store = { workspace = true }
```

- [ ] **Step 3: Add the helper to `crates/picoframe-core/src/lib.rs`**

Change the `use tauri::{...}` block (lines 9-12) to also import `AppHandle`:

```rust
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Runtime,
};
```

Then append to the end of the file:

```rust
/// The single disk store file picoframe apps share, in the app data dir. Both the JS
/// side (`@picoframe/store`'s `createTauriStore`) and Rust plugins open this file, so
/// no plugin needs to own "the" store. Namespace keys by convention, e.g. `"hello.draft"`.
pub const STORE_PATH: &str = "picoframe.json";

/// Handle to the shared picoframe store for the Rust side. Requires the app to register
/// `tauri_plugin_store::Builder::default().build()` (the CLI app template does this).
pub fn store<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<std::sync::Arc<tauri_plugin_store::Store<R>>, tauri_plugin_store::Error> {
    use tauri_plugin_store::StoreExt;
    app.store(STORE_PATH)
}
```

- [ ] **Step 4: Verify it compiles**

Run: `cargo build -p picoframe-core`
Expected: PASS. If the return type mismatches the installed `tauri-plugin-store` version, adjust to the exact type the compiler reports for `app.store(...)` (it is `Result<Arc<Store<R>>, Error>` in v2).

- [ ] **Step 5: Commit**

```bash
git add Cargo.toml crates/picoframe-core/Cargo.toml crates/picoframe-core/src/lib.rs
git commit -m "picoframe-core: add store() helper over tauri-plugin-store"
```

---

## Task 9: Wire the store into the CLI app template

**Files:**
- Modify: `packages/cli/templates/app/package.json`
- Modify: `packages/cli/templates/app/src/main.tsx`
- Modify: `packages/cli/templates/app/src-tauri/Cargo.toml`
- Modify: `packages/cli/templates/app/src-tauri/src/main.rs`
- Modify: `packages/cli/templates/app/src-tauri/capabilities/default.json`

- [ ] **Step 1: Add JS deps to the template `package.json`**

In `packages/cli/templates/app/package.json`, under `dependencies`, add after the `@picoframe/frame` line:

```json
    "@picoframe/store": "^0.0.1",
```

and after the `@tauri-apps/api` line:

```json
    "@tauri-apps/plugin-store": "^2.2.0",
```

- [ ] **Step 2: Inject the store in the template `main.tsx`**

Replace `packages/cli/templates/app/src/main.tsx` contents with:

```tsx
import { AppFrame } from "@picoframe/frame";
import { createTauriStore } from "@picoframe/store";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { plugins } from "./app.plugins";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

createRoot(root).render(
  <StrictMode>
    <AppFrame plugins={plugins} store={createTauriStore()} title="{{APP_NAME}}" />
  </StrictMode>,
);
```

- [ ] **Step 3: Add the Rust dep to the template `Cargo.toml`**

In `packages/cli/templates/app/src-tauri/Cargo.toml`, under `[dependencies]`, add after `tauri-plugin-opener = "2"`:

```toml
tauri-plugin-store = "2"
```

- [ ] **Step 4: Register the plugin in the template `main.rs`**

In `packages/cli/templates/app/src-tauri/src/main.rs`, change the opener plugin line so the store plugin registers alongside it. Replace:

```rust
        .plugin(tauri_plugin_opener::init());
```

with:

```rust
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build());
```

- [ ] **Step 5: Grant the store capability in the template `default.json`**

In `packages/cli/templates/app/src-tauri/capabilities/default.json`, change the `permissions` array to:

```json
  "permissions": ["core:default", "opener:default", "store:default"]
```

- [ ] **Step 6: Verify the CLI still type-checks and its tests pass**

Run: `bun run typecheck`
Expected: PASS.

Run: `bun test packages/cli`
Expected: PASS (template-copy/wiring tests unaffected).

- [ ] **Step 7: Commit**

```bash
git add packages/cli/templates/app/package.json packages/cli/templates/app/src/main.tsx packages/cli/templates/app/src-tauri/Cargo.toml packages/cli/templates/app/src-tauri/src/main.rs packages/cli/templates/app/src-tauri/capabilities/default.json
git commit -m "cli: wire the shared disk store into the app template"
```

---

## Task 10: Wire the store into the demo + demonstrate form-draft persistence

**Files:**
- Modify: `apps/demo/package.json`
- Modify: `apps/demo/src/main.tsx`
- Modify: `apps/demo/src/demo-extras.tsx`
- Modify: `apps/demo/src-tauri/Cargo.toml`
- Modify: `apps/demo/src-tauri/src/main.rs`
- Modify: `apps/demo/src-tauri/capabilities/default.json`

- [ ] **Step 1: Add demo JS deps**

In `apps/demo/package.json`, under `dependencies`, add after the `@picoframe/frame` line:

```json
    "@picoframe/store": "workspace:*",
```

and after the `@tauri-apps/api` line:

```json
    "@tauri-apps/plugin-store": "^2.2.0",
```

- [ ] **Step 2: Inject the store in the demo `main.tsx`**

Replace `apps/demo/src/main.tsx` contents with:

```tsx
import { AppFrame } from "@picoframe/frame";
import { createTauriStore } from "@picoframe/store";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { plugins } from "./app.plugins";
import { demoExtrasPlugin } from "./demo-extras";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

createRoot(root).render(
  <StrictMode>
    <AppFrame
      plugins={[...plugins, demoExtrasPlugin]}
      store={createTauriStore()}
      title="picoframe demo"
    />
  </StrictMode>,
);
```

This matches the current `apps/demo/src/main.tsx` exactly (same `plugins` / `demoExtrasPlugin` imports); the only additions are the `@picoframe/store` import and the `store={createTauriStore()}` prop.

- [ ] **Step 3: Add a route + a form whose draft persists across navigation**

In `apps/demo/src/demo-extras.tsx`, change the import on line 1 to add `usePersistentValue`:

```tsx
import { type FramePlugin, Button, Input, useDrawer, usePersistentValue, useSetting } from "@picoframe/frame";
```

Add this component after `GraphicsSettings` (after line 46):

```tsx
/** A page whose draft text survives navigating away and back — via the disk store. */
function DraftPage() {
  const [draft, setDraft] = usePersistentValue("demo.notes.draft", "");
  return (
    <div className="grid max-w-lg gap-3 p-6">
      <h1 className="text-lg font-semibold">Scratch notes</h1>
      <textarea
        className="min-h-40 rounded-md border p-3 text-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Type here, navigate away, come back — it's still here."
      />
      <p className="text-xs text-muted-foreground">
        Persisted to disk via usePersistentValue; survives navigation and reload.
      </p>
    </div>
  );
}
```

Add a route and a nav item to the `demoExtrasPlugin`. Replace `routes: [],` (line 97) with:

```tsx
  routes: [{ path: "notes", lazy: () => Promise.resolve({ default: DraftPage }), crumb: "Notes" }],
```

and add a nav group. Replace the `nav: [` opening (line 98) through its first group so a Notes link exists — insert this item group as the first entry of the `nav` array (before the existing `demo.resources` group):

```tsx
  nav: [
    {
      id: "demo.main",
      order: 10,
      items: [{ id: "demo.notes", label: "Notes", to: "/notes", order: 10 }],
    },
```

(Leave the existing `demo.resources` group and everything after it unchanged.)

- [ ] **Step 4: Add the demo Rust dep**

In `apps/demo/src-tauri/Cargo.toml`, under `[dependencies]`, add after `tauri-plugin-opener = { workspace = true }`:

```toml
tauri-plugin-store = { workspace = true }
```

- [ ] **Step 5: Register the plugin in the demo `main.rs`**

In `apps/demo/src-tauri/src/main.rs`, replace:

```rust
        .plugin(tauri_plugin_opener::init());
```

with:

```rust
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build());
```

- [ ] **Step 6: Grant the store capability in the demo `default.json`**

In `apps/demo/src-tauri/capabilities/default.json`, change `permissions` to:

```json
  "permissions": ["core:default", "opener:default", "store:default"]
```

- [ ] **Step 7: Install, type-check, and build the backend**

Run: `bun install`
Expected: `@picoframe/store` linked into the demo.

Run: `bun run typecheck`
Expected: PASS.

Run: `cargo build -p picoframe-demo`
Expected: PASS.

- [ ] **Step 8: Manually verify persistence in the running app**

Run: `bun run dev`
Then: open the demo, go to **Notes**, type text, navigate to another page and back — the text is still there. Restart the app — the text is still there (proves disk-backing, not just in-memory). Report the observed result honestly; do not claim success without seeing it.

- [ ] **Step 9: Commit**

```bash
git add apps/demo/package.json apps/demo/src/main.tsx apps/demo/src/demo-extras.tsx apps/demo/src-tauri/Cargo.toml apps/demo/src-tauri/src/main.rs apps/demo/src-tauri/capabilities/default.json
git commit -m "demo: persist scratch-notes draft via the shared disk store"
```

---

## Task 11: Version bumps and final verification

**Files:**
- Modify: `packages/frame/package.json`

- [ ] **Step 1: Bump the frame version**

In `packages/frame/package.json`, change `"version": "0.0.9"` (line 3) to:

```json
  "version": "0.0.10",
```

(`@picoframe/store` is already `0.0.1`, `picoframe-core` already `0.0.3` from Task 8. The CLI package version bump, if the repo bumps it per release, is done here too if applicable — check `packages/cli/package.json` and bump its patch version to match the release.)

- [ ] **Step 2: Full verification sweep**

Run: `bun run typecheck`
Expected: PASS.

Run: `bun test`
Expected: PASS (frame settings tests + new store tests).

Run: `bun run build`
Expected: PASS (plugin-sdk → frame → store → hello all build to `dist/`).

Run: `cargo build`
Expected: PASS (core + hello + demo).

- [ ] **Step 3: Commit**

```bash
git add packages/frame/package.json
git commit -m "frame: release 0.0.10 (general persistent store)"
```

---

## Self-review notes (addressed)

- **Sync/async bridge:** `cachedAdapter` serves sync `get` from cache, persists async, and re-notifies on `hydrate` so hooks mounted before disk load re-read (Task 3 + Task 6).
- **Cross-process reads:** `store.onChange` → cache refresh → `subscribe` listeners → `usePersistentValue` re-read (Tasks 2, 3, 6).
- **Frame stays Tauri-free:** no `@tauri-apps/*` added to `@picoframe/frame`; the only Tauri-coupled JS is `@picoframe/store` (Tasks 5-7).
- **Back-compat:** `SettingsStorage`, `createSettingsStore`, `SettingsStoreProvider`, `useSetting`, and `AppFrame.settingsStorage` all retained as aliases; existing `store.test.ts` and `demo-extras` `useSetting` calls keep working.
- **Known minor:** a *local* `set` notifies subscribers twice (store's own notify + adapter `onChange`). Harmless (an extra re-read of the same value); not worth added self-write tracking (YAGNI).
- **Honesty:** the real Tauri IPC path has no in-repo test harness; it is demo-verified in Task 10 Step 8, stated as such rather than implied by unit tests.
