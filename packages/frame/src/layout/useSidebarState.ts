import { useCallback } from "react";
import { usePersistentState } from "../lib/usePersistentState";

/**
 * localStorage key the frame uses for the docked sidebar's collapse state. Exported so an
 * app can seed or clear it directly if needed; prefer {@link useSidebarState} for reads/writes.
 */
export const SIDEBAR_COLLAPSED_KEY = "picoframe.sidebar.collapsed";

/** Imperative handle on the frame's sidebar collapse state. */
export interface SidebarState {
  /** `true` when the docked sidebar is collapsed to its icon rail. */
  collapsed: boolean;
  /** Set the collapsed state (value or updater), mirrored to persistence. */
  setCollapsed: (next: boolean | ((prev: boolean) => boolean)) => void;
  /** Flip the collapsed state — convenience for a "toggle sidebar" command. */
  toggle: () => void;
}

/**
 * Read and drive the frame's sidebar collapse state from anywhere inside `<AppFrame>`.
 *
 * The frame owns this state internally (the top-bar toggle uses it); this hook exposes the
 * same value so an app-level command surface (command palette, keyboard shortcut) can offer a
 * "toggle sidebar" action. Backed by the shared persistent store keyed by
 * {@link SIDEBAR_COLLAPSED_KEY}, so every consumer — including the frame's own layout — stays
 * in sync live, with no reload.
 *
 * Note: this drives the *docked* rail. In `popover` layout mode the sidebar is an overlay
 * whose open/closed state is separate and not exposed here, so `toggle` has no visible effect
 * there.
 */
export function useSidebarState(): SidebarState {
  const [collapsed, setCollapsed] = usePersistentState(SIDEBAR_COLLAPSED_KEY, false);
  const toggle = useCallback(() => setCollapsed((v) => !v), [setCollapsed]);
  return { collapsed, setCollapsed, toggle };
}
