"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type SettingsStorage, localStorageAdapter } from "./storage";
import { type SettingsStore, createSettingsStore } from "./store";

const SettingsStoreContext = createContext<SettingsStore | null>(null);

export function SettingsStoreProvider({
  storage,
  children,
}: {
  storage?: SettingsStorage;
  children: ReactNode;
}) {
  const store = useMemo(() => createSettingsStore(storage ?? localStorageAdapter()), [storage]);
  return <SettingsStoreContext.Provider value={store}>{children}</SettingsStoreContext.Provider>;
}

/**
 * Read/write a persisted setting. Frame-managed and reactive: components bound to the
 * same `key` stay in sync, and the value persists via the configured `settingsStorage`.
 */
export function useSetting<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const store = useContext(SettingsStoreContext);
  if (!store) throw new Error("useSetting must be used within <AppFrame>");

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
