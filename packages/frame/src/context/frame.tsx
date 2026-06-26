import type { NavGroup } from "@picoframe/plugin-sdk";
import { type ReactNode, createContext, useContext } from "react";
import type { CrumbResolvers } from "../routing/crumbs";
import type { ComposedSettings } from "../settings/composeSettings";

export interface FrameContextValue {
  title: string;
  nav: NavGroup[];
  /** Breadcrumb resolvers: static parent labels + per-route `crumb` patterns. */
  crumbs: CrumbResolvers;
  /** Generic route-loading fallback (no per-component skeletons). */
  fallback: ReactNode;
  /** Composed plugin settings sections (tree + id lookup) for the /settings page. */
  settings: ComposedSettings;
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
