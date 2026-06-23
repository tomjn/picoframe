import type { ComponentType, ReactNode } from "react";

/** Icon component compatible with lucide-react and similar. */
export type IconComponent = ComponentType<{ size?: number; className?: string }>;

/** A single sidebar navigation entry, linking to a route. */
export interface NavItem {
  /** Stable, plugin-namespaced id, e.g. "hello.home". */
  id: string;
  label: string;
  /** Route path this item links to; must match a registered FrameRoute. */
  to: string;
  icon?: IconComponent;
  /** Exact-match the link (React Router NavLink `end`). */
  end?: boolean;
  /** Sort order within the group (default 100). */
  order?: number;
  /** Optional live badge (count, dot) rendered next to the label. */
  badge?: () => ReactNode;
}

/** A labelled group of nav items. Groups with the same `id` merge across plugins. */
export interface NavGroup {
  id: string;
  /** Section header; omit for top-level ungrouped items. */
  label?: string;
  order?: number;
  items: NavItem[];
}

/** A route contributed by a plugin. Lazy by default for code-splitting. */
export interface FrameRoute {
  /** Path relative to the app root (no leading slash needed). Omit for an index route. */
  path?: string;
  /** Marks this as the index route of its parent (mutually exclusive with `path`). */
  index?: boolean;
  lazy: () => Promise<{ default: ComponentType }>;
  /** Breadcrumb label; falls back to a title-cased path segment. */
  crumb?: string;
  children?: FrameRoute[];
}

/** Named injection points the frame shell exposes. String-widened for forward-compat. */
export type SlotId =
  | "topbar.left"
  | "topbar.right"
  | "sidebar.footer"
  | "statusbar"
  | "command-palette"
  | (string & {});

export interface SlotContribution {
  slot: SlotId;
  order?: number;
  Component: ComponentType;
}

/** The full contribution surface of a picoframe plugin (frontend half). */
export interface FramePlugin {
  /** Plugin id, e.g. "hello". Should match the npm package suffix. */
  id: string;
  version: string;
  nav?: NavGroup[];
  routes: FrameRoute[];
  slots?: SlotContribution[];
  /** Optional provider wrapping the whole app (e.g. a React Query context). */
  Provider?: ComponentType<{ children: ReactNode }>;
}
