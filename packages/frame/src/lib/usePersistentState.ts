import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Per-key subscriber registry. Every `usePersistentState` sharing a key subscribes here, so
 * a write from any instance re-renders them all in the same commit — no reload, no remount.
 */
const subscribers = new Map<string, Set<() => void>>();

function emit(key: string) {
  const subs = subscribers.get(key);
  if (subs) for (const cb of subs) cb();
}

function subscribe(key: string, cb: () => void): () => void {
  let subs = subscribers.get(key);
  if (!subs) subscribers.set(key, (subs = new Set()));
  subs.add(cb);
  return () => {
    subs.delete(cb);
    if (subs.size === 0) subscribers.delete(key);
  };
}

// Cross-tab: a write in another document fires `storage` here; nudge that key's subscribers.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== null) emit(e.key);
  });
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * `useState` mirrored to localStorage under `key`, shared across every instance of the same
 * key. Safe if storage is unavailable (falls back to `initial`).
 */
export function usePersistentState<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  // Snapshot is the raw string (a primitive, value-compared) so it stays referentially stable
  // when unchanged — parsing here would mint a new object each call and loop forever.
  const raw = useSyncExternalStore(
    (cb) => subscribe(key, cb),
    () => readRaw(key),
    () => null,
  );

  const value = useMemo<T>(() => {
    if (raw === null) return initial;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  }, [raw, initial]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const cur = readRaw(key);
      let prev: T;
      try {
        prev = cur === null ? initial : (JSON.parse(cur) as T);
      } catch {
        prev = initial;
      }
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // ignore write failures (private mode, quota)
      }
      emit(key);
    },
    [key, initial],
  );

  return [value, set];
}
