import { expect, test } from "bun:test";
import type { SettingsStorage } from "./storage";
import { createPersistentStore, createSettingsStore } from "./store";

function mockStorage(): SettingsStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: (k) => data.get(k) ?? null,
    set: (k, v) => {
      data.set(k, v);
    },
  };
}

test("get returns the fallback when the key is absent", () => {
  const store = createSettingsStore(mockStorage());
  expect(store.get("missing", 42)).toBe(42);
});

test("set then get round-trips a JSON value", () => {
  const store = createSettingsStore(mockStorage());
  store.set("k", { a: 1, b: ["x"] });
  expect(store.get<{ a: number; b: string[] } | null>("k", null)).toEqual({ a: 1, b: ["x"] });
});

test("get returns the fallback when stored JSON is malformed", () => {
  const storage = mockStorage();
  storage.data.set("k", "{not json");
  const store = createSettingsStore(storage);
  expect(store.get("k", "fallback")).toBe("fallback");
});

test("subscribers for a key are notified on set", () => {
  const store = createSettingsStore(mockStorage());
  let calls = 0;
  store.subscribe("k", () => calls++);
  store.set("k", 1);
  expect(calls).toBe(1);
});

test("subscribers are not notified for a different key", () => {
  const store = createSettingsStore(mockStorage());
  let calls = 0;
  store.subscribe("k", () => calls++);
  store.set("other", 1);
  expect(calls).toBe(0);
});

test("unsubscribe stops notifications", () => {
  const store = createSettingsStore(mockStorage());
  let calls = 0;
  const unsub = store.subscribe("k", () => calls++);
  unsub();
  store.set("k", 1);
  expect(calls).toBe(0);
});

test("a write to any key notifies the any-listeners and moves the revision", () => {
  const store = createSettingsStore(mockStorage());
  let calls = 0;
  const before = store.revision();
  const unsub = store.subscribeAny(() => calls++);
  store.set("k", 1);
  store.set("other", 2);
  expect(calls).toBe(2);
  expect(store.revision()).not.toBe(before);

  unsub();
  const settled = store.revision();
  store.set("k", 3);
  expect(calls).toBe(2);
  // The counter keeps moving with no listeners, so a reader that missed the write
  // still sees that something changed.
  expect(store.revision()).not.toBe(settled);
});

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

  let anyCalls = 0;
  store.subscribeAny(() => anyCalls++);

  // Simulate a cross-process write arriving through the storage adapter.
  for (const l of storageListeners.get("k") ?? []) l();
  expect(calls).toBe(1);
  // A crumb reading that key has no subscription of its own, so the outside write has
  // to reach the any-listeners too.
  expect(anyCalls).toBe(1);

  // After unsubscribe, storage-level changes no longer reach the listener.
  unsub();
  expect(storageListeners.get("k")?.size ?? 0).toBe(0);
});
