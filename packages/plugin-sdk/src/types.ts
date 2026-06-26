import type { ComponentType, ReactNode } from "react";

/** Icon component compatible with lucide-react and similar. */
export type IconComponent = ComponentType<{ size?: number; className?: string }>;

/** A single sidebar navigation entry, linking to a route or an external URL. */
export interface NavItem {
  /** Stable, plugin-namespaced id, e.g. "hello.home". */
  id: string;
  label: string;
  /** Internal route path this item links to; must match a registered FrameRoute. Omit when using `href`. */
  to?: string;
  /** External URL opened in the system browser (via the Tauri opener). Mutually exclusive with `to`. */
  href?: string;
  icon?: IconComponent;
  /** Exact-match the link (React Router NavLink `end`). */
  end?: boolean;
  /**
   * Show this item in the sidebar. Default `true`; set `false` for items that should
   * only appear on the home launcher (e.g. an external docs link you don't want
   * cluttering the sidebar).
   */
  sidebar?: boolean;
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

/** Context passed to a dynamic breadcrumb label function. */
export interface CrumbContext {
  /** Matched route params for the crumb's path, e.g. `{ id: "42" }` for pattern `/users/:id`. */
  params: Record<string, string | undefined>;
  /** The concrete absolute path this crumb resolves, e.g. `/users/42`. */
  pathname: string;
}

/** Resolve a breadcrumb label dynamically from the matched route params. */
export type CrumbFn = (ctx: CrumbContext) => string;

/** A route contributed by a plugin. Lazy by default for code-splitting. */
export interface FrameRoute {
  /** Path relative to the app root (no leading slash needed). Omit for an index route. */
  path?: string;
  /** Marks this as the index route of its parent (mutually exclusive with `path`). */
  index?: boolean;
  lazy: () => Promise<{ default: ComponentType }>;
  /**
   * Breadcrumb label: a string, or a function of the matched route params for
   * dynamic segments (e.g. `(c) => userName(c.params.id)`). Falls back to a
   * title-cased path segment when omitted.
   */
  crumb?: string | CrumbFn;
  children?: FrameRoute[];
}

/**
 * A settings section contributed by a plugin. Sections form a tree via `parent` and
 * merge by `id` across plugins, so a plugin can attach a sub-section to a category it
 * does not own. Each `id` is the stable hot-link key: the section is reachable at
 * `/settings/<id>`.
 */
export interface SettingsSection {
  /** Globally-unique, namespaced, path-safe id, e.g. "recoil.engine.graphics". */
  id: string;
  title: string;
  /** Sibling sort within the parent; default 100. */
  order?: number;
  description?: string;
  icon?: IconComponent;
  /** Nest under another section/category id. Omit for a top-level category. */
  parent?: string;
  /** Renders the section's controls. Optional for pure grouping/category nodes. */
  Component?: ComponentType;
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
  /**
   * Static breadcrumb labels for absolute paths that are not themselves a
   * registered route — typically an intermediate parent segment. Keys are
   * absolute paths (leading slash optional): `{ "reports/archive": "Archived" }`.
   * For labels that depend on route params, use a `FrameRoute.crumb` function instead.
   */
  crumbs?: Record<string, string>;
  slots?: SlotContribution[];
  settings?: SettingsSection[];
  /** Optional provider wrapping the whole app (e.g. a React Query context). */
  Provider?: ComponentType<{ children: ReactNode }>;
}
