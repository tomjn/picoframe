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
      onChangeCb = cb as (key: string, value: unknown) => void;
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
