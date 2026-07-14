"use client";

import { type ReactNode, createContext, useCallback, useContext, useMemo, useReducer } from "react";
import { type DrawerContainer, type DrawerOptions, drawerReducer, initialDrawerState } from "./reducer";

export type {
  DrawerContainer,
  DrawerDirection,
  DrawerOptions,
  DrawerSize,
} from "./reducer";

export interface DrawerController {
  open(options: DrawerOptions): void;
  close(): void;
  isOpen: boolean;
}

interface DrawerContextValue {
  isOpen: boolean;
  options: DrawerOptions | null;
  container?: DrawerContainer;
  open: (options: DrawerOptions) => void;
  close: () => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

export interface DrawerProviderProps {
  children: ReactNode;
  /**
   * Provider-level default portal target for every drawer, overridable per-open via
   * `open({ container })`. Omit to portal into `document.body` (the default).
   */
  container?: DrawerContainer;
}

export function DrawerProvider({ children, container }: DrawerProviderProps) {
  const [state, dispatch] = useReducer(drawerReducer, initialDrawerState);
  const open = useCallback((options: DrawerOptions) => dispatch({ type: "open", options }), []);
  const close = useCallback(() => dispatch({ type: "close" }), []);
  const value = useMemo<DrawerContextValue>(
    () => ({ isOpen: state.isOpen, options: state.options, container, open, close }),
    [state.isOpen, state.options, container, open, close],
  );
  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}

function useDrawerContext(): DrawerContextValue {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useDrawer must be used within <AppFrame>");
  return ctx;
}

/** Open/close the single, frame-managed side drawer from anywhere in the app. */
export function useDrawer(): DrawerController {
  const { open, close, isOpen } = useDrawerContext();
  return { open, close, isOpen };
}

/** @internal — consumed by DrawerHost. */
export function useDrawerHost() {
  const { isOpen, options, container, close } = useDrawerContext();
  return { isOpen, options, container, close };
}
