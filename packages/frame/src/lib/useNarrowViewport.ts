import { useCallback, useSyncExternalStore } from "react";

/** Default viewport width (px) below which the frame treats the window as narrow. */
export const SIDEBAR_NARROW_BREAKPOINT = 640;

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

/**
 * `true` while the viewport is narrower than `breakpoint` (px).
 *
 * Read through `useSyncExternalStore` so the very first render already knows the width.
 * An effect-based read would paint one frame of the wide layout (a docked sidebar flashing
 * on a narrow window) before correcting itself.
 */
export function useNarrowViewport(breakpoint: number = SIDEBAR_NARROW_BREAKPOINT): boolean {
  // Width is read per event rather than cached. The snapshot is a boolean, so React re-renders
  // only when the window actually crosses the breakpoint, not on every pixel of a drag.
  const getSnapshot = useCallback(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint,
    [breakpoint],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
