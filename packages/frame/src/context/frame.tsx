import type { NavGroup } from "@picoframe/plugin-sdk";
import { type ReactNode, createContext, useContext } from "react";

export interface FrameContextValue {
  title: string;
  nav: NavGroup[];
  /** Absolute route path -> explicit breadcrumb label (from `FrameRoute.crumb`). */
  crumbs: Map<string, string>;
  /** Generic route-loading fallback (no per-component skeletons). */
  fallback: ReactNode;
}

const FrameContext = createContext<FrameContextValue | null>(null);

export function FrameProvider({ value, children }: { value: FrameContextValue; children: ReactNode }) {
  return <FrameContext.Provider value={value}>{children}</FrameContext.Provider>;
}

export function useFrame(): FrameContextValue {
  const ctx = useContext(FrameContext);
  if (!ctx) throw new Error("useFrame must be used within <AppFrame>");
  return ctx;
}
