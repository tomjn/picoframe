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
  /**
   * Sub-text shown beneath the label on the home-launcher card (not the sidebar). Replaces
   * the route path that would otherwise appear there; omit to show nothing in its place.
   */
  description?: ReactNode;
  /** Exact-match the link (React Router NavLink `end`). */
  end?: boolean;
  /**
   * Additional route patterns that force this item's active (highlighted) state, on top of
   * the default NavLink match against `to`. Useful when an item is the conceptual home for
   * sibling routes at unrelated paths (e.g. a Home item that should stay lit on `/catch-up`).
   * Each pattern is matched as a prefix (React Router `matchPath`, `end: false`) and may carry
   * `:params` or a `*` splat: `matches: ["/catch-up", "/inbox/*"]`. Purely presentational —
   * it changes only the highlight, not routing or the link target.
   */
  matches?: string[];
  /**
   * Full control over the item's forced active state: a predicate of the current pathname,
   * evaluated on every navigation. Return `true` to force the highlight. Combined (OR) with the
   * default NavLink match and any `matches` patterns. Purely presentational, like `matches`.
   */
  activeWhen?: (pathname: string) => boolean;
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
  /**
   * Live visibility gate. A hook, evaluated in the item's own render (in the sidebar),
   * so it may call `useSetting` / `useContext` / any hook. Return `false` to hide the
   * item from the sidebar; default is always visible. Purely presentational — to also
   * make the route unreachable while hidden, wrap the page in `<NavGate>` using the same
   * predicate. Distinct from `sidebar: false`, which is a static "never a sidebar entry".
   *
   * Items may be added to or removed from the nav at runtime. The one rule (React's rules
   * of hooks): a given item `id` must keep a stable shape — either always define
   * `useVisible` or never — since the sidebar evaluates it as a hook per item.
   */
  useVisible?: () => boolean;
  /**
   * Reactive overrides for the item's presentation, each a hook evaluated in the item's
   * own render (sidebar and/or launcher), so they may call `useSetting` / `useContext`.
   * When present, each replaces its static counterpart and updates live — handy for a
   * temporary route named after a resolving domain object. Same rules-of-hooks constraint
   * as `useVisible`: a given item `id` must consistently define, or not define, each hook.
   */
  useLabel?: () => string;
  /** Reactive override for {@link description} (launcher card sub-text). */
  useDescription?: () => ReactNode;
  /** Reactive override for {@link icon}. */
  useIcon?: () => IconComponent;
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

/**
 * Resolve a breadcrumb label dynamically from the matched route params. Return an
 * array to expand the one segment into several crumbs (see {@link FrameRoute.crumb}).
 */
export type CrumbFn = (ctx: CrumbContext) => string | string[];

/** A forced light/dark appearance, overriding the user's own theme setting. */
export type RouteAppearance = "light" | "dark";

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
   *
   * An array expands this one segment into several crumbs, giving a flat route a
   * synthetic ancestor it has no URL segment for: `["Catch-up", "Inbox"]` on
   * `/inbox` reads as `Catch-up / Inbox`. Only the last piece corresponds to the
   * path, so only it can be a link. The ancestors render as plain text.
   */
  crumb?: string | string[] | CrumbFn;
  /**
   * Number of trailing URL segments this route's single crumb stands for. Default 1.
   *
   * Set it on an entity route whose leading segment is not a route of its own.
   * `path: ":owner/:name"` with `crumbSpan: 2` and a crumb of
   * `` `${params.owner}/${params.name}` `` renders one merged `acme/repo` crumb
   * instead of a title-cased `Acme` followed by it.
   */
  crumbSpan?: number;
  /**
   * Force light or dark for this route, whatever the user's theme setting. Omit to
   * follow the setting, which is what almost every route should do.
   *
   * It applies to the whole window, chrome included, so a page whose content is
   * inherently one appearance (a photo or video canvas, a print preview) does not
   * leave the top bar and sidebar clashing with it. Nested routes inherit it, and
   * the most specific matching route wins.
   */
  appearance?: RouteAppearance;
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
  /**
   * Content width of the rendered section. `md` (default) suits label/control
   * forms; data-dense sections (tables, per-item cards, wide read-only values)
   * can opt into `lg` or `full`. Note the content pane constrains the
   * *container*, so section components should prefer container queries over
   * viewport breakpoints for internal responsive layout.
   */
  width?: "md" | "lg" | "full";
  /** Nest under another section/category id. Omit for a top-level category. */
  parent?: string;
  /** Renders the section's controls. Optional for pure grouping/category nodes. */
  Component?: ComponentType;
  /**
   * Live visibility gate. A hook, evaluated in the section's own render within the
   * settings tree, so it may call `useSetting` / `useContext` / any hook. Return
   * `false` to hide the section (and its rendered subtree) from the settings
   * navigation; default is visible. Purely presentational and independent of the
   * feature's nav item — the section stays reachable at `/settings/<id>` by direct
   * link. The `/settings` default redirect skips hidden sections, landing on the
   * first visible one. A given
   * section `id` must consistently define, or never define, `useVisible` (React's
   * rules of hooks).
   */
  useVisible?: () => boolean;
}

/** Named injection points the frame shell exposes. String-widened for forward-compat. */
export type SlotId =
  | "topbar.left"
  | "topbar.center"
  | "topbar.right"
  | "sidebar.footer"
  | "statusbar"
  | "command-palette"
  | "home.top"
  | "home.bottom"
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
   *
   * An array expands one path into several crumbs, the same as `FrameRoute.crumb`:
   * `{ "/inbox": ["Catch-up", "Inbox"] }` reads as `Catch-up / Inbox`.
   */
  crumbs?: Record<string, string | string[]>;
  slots?: SlotContribution[];
  settings?: SettingsSection[];
  /** Optional provider wrapping the whole app (e.g. a React Query context). */
  Provider?: ComponentType<{ children: ReactNode }>;
}
