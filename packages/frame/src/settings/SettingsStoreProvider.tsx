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
