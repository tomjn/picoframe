import type { ReactNode } from "react";

/** Edge the drawer slides in from. `left`/`right` are side sheets, `bottom` is a bottom sheet. */
export type DrawerDirection = "left" | "right" | "bottom";

/** Named size, mapped per-direction to a width (side sheets) or height (bottom sheet). */
export type DrawerSize = "sm" | "md" | "lg" | "full";

/**
 * Portal target for the drawer + its overlay. An `HTMLElement` (or a function returning one,
 * resolved lazily so the target can mount after the provider), or `null`/omitted to use
 * `document.body`. A supplied container must be `position: relative` (and typically
 * `overflow: hidden` for rounded corners) so the absolutely-positioned panel stays inside it.
 */
export type DrawerContainer = HTMLElement | null | (() => HTMLElement | null);

export interface DrawerOptions {
  content: ReactNode;
  /** Edge the drawer slides in from. Default "right". */
  direction?: DrawerDirection;
  /** @deprecated Use `direction`. Retained as an alias; `direction` wins if both are set. */
  side?: "left" | "right";
  /** Named size (see {@link DrawerSize}). Default "md". Overridden by `width`/`height`. */
  size?: DrawerSize;
  title?: string;
  description?: string;
  /** Explicit CSS width for side sheets, e.g. "24rem". Overrides `size`. */
  width?: string;
  /** Explicit CSS height for the bottom sheet, e.g. "40vh". Overrides `size`. */
  height?: string;
  /** Per-open portal target, overriding the provider-level default (see {@link DrawerContainer}). */
  container?: DrawerContainer;
}

export interface DrawerState {
  isOpen: boolean;
  options: DrawerOptions | null;
}

export type DrawerAction = { type: "open"; options: DrawerOptions } | { type: "close" };

export const initialDrawerState: DrawerState = { isOpen: false, options: null };

export function drawerReducer(state: DrawerState, action: DrawerAction): DrawerState {
  switch (action.type) {
    case "open":
      return { isOpen: true, options: action.options };
    case "close":
      // Keep `options` so content stays mounted through the exit animation.
      return { ...state, isOpen: false };
  }
}
