import { useCallback, useEffect, useState } from "react";

/** `useState` mirrored to localStorage under `key`. Safe if storage is unavailable. */
export function usePersistentState<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore write failures (private mode, quota)
    }
  }, [key, value]);

  const set = useCallback((next: T | ((prev: T) => T)) => setValue(next), []);
  return [value, set];
}
