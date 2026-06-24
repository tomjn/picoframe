import type { ReactNode } from "react";

export interface DrawerOptions {
  content: ReactNode;
  /** Side the drawer slides in from. Default "right". */
  side?: "left" | "right";
  title?: string;
  description?: string;
  /** CSS width, e.g. "24rem". Defaults to a sensible width. */
  width?: string;
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
