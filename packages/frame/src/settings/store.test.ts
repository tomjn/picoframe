import { expect, test } from "bun:test";
import type { SettingsStorage } from "./storage";
import { createSettingsStore } from "./store";

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
