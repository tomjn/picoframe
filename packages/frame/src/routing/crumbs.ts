import type { CrumbFn, FramePlugin, FrameRoute } from "@picoframe/plugin-sdk";
import { matchPath } from "react-router";

/** Join a base path and a (possibly multi-segment) child segment into an absolute path. */
function joinPath(base: string, seg: string): string {
  const cleaned = seg.replace(/^\/+|\/+$/g, "");
  if (!cleaned) return base || "/";
  return base === "/" || base === "" ? `/${cleaned}` : `${base}/${cleaned}`;
}

/** Normalize a slash-optional path to an absolute one: "reports/archive" -> "/reports/archive". */
function absPath(p: string): string {
  const cleaned = p.replace(/^\/+|\/+$/g, "");
  return cleaned ? `/${cleaned}` : "/";
}

/**
 * Resolved breadcrumb sources, derived once per plugin set. `static` covers
 * explicit labels for arbitrary paths (incl. parent segments with no route);
 * `patterns` carries each route's `crumb` keyed by its full pattern (which may
 * contain `:params`), so dynamic segments resolve from the live path.
 */
export interface CrumbResolvers {
  /**
   * Absolute path -> static label(s). A string is one crumb; an array expands a
   * single URL segment into several crumbs (e.g. flat `/settings/engine.graphics`
   * -> `["Engine", "Graphics"]` so the bar shows the section's ancestry).
   */
  static: Map<string, string | string[]>;
  /** Route patterns (possibly with `:params`) and their crumb, in registration order. */
  patterns: { pattern: string; crumb: string | CrumbFn }[];
  /**
   * Full pattern of every contributed route (with or without a `crumb`), so a
   * breadcrumb segment can be tested for navigability. A static label alone does
   * not imply a route — parent segments may be labeled but have nowhere to go.
   */
  routes: string[];
}

/**
 * Build the breadcrumb resolvers from every plugin's static `crumbs` map and the
 * `crumb` on each contributed route. Replaces the old flat string map so the top
 * bar can honor both explicit parent labels and param-aware label functions
 * without a React Router data router.
 */
export function buildCrumbResolvers(plugins: FramePlugin[]): CrumbResolvers {
  const staticMap = new Map<string, string>();
  const patterns: { pattern: string; crumb: string | CrumbFn }[] = [];
  const routes: string[] = [];

  for (const p of plugins) {
    for (const [path, label] of Object.entries(p.crumbs ?? {})) {
      staticMap.set(absPath(path), label);
    }
  }

  const walk = (rs: FrameRoute[], base: string) => {
    for (const r of rs) {
      const full = r.index ? base || "/" : joinPath(base, r.path ?? "");
      routes.push(full);
      if (r.crumb !== undefined) patterns.push({ pattern: full, crumb: r.crumb });
      if (r.children) walk(r.children, full);
    }
  };
  walk(plugins.flatMap((p) => p.routes), "/");

  return { static: staticMap, patterns, routes };
}

/**
 * Resolve the breadcrumb label for one absolute path: a static label wins, else
 * the first route pattern that matches (calling a `CrumbFn` with the matched
 * params), else `undefined` so the caller can fall back to `titleCase`.
 */
export function resolveCrumb(resolvers: CrumbResolvers, path: string): string | string[] | undefined {
  const fromStatic = resolvers.static.get(path);
  if (fromStatic !== undefined) return fromStatic;
  for (const { pattern, crumb } of resolvers.patterns) {
    const match = matchPath({ path: pattern, end: true }, path);
    if (match) return typeof crumb === "function" ? crumb({ params: match.params, pathname: path }) : crumb;
  }
  return undefined;
}

/**
 * Decode a single URL path segment (e.g. `my%20page` -> `my page`) for crumb
 * lookups and labels. Falls back to the raw segment if it isn't valid encoding,
 * so a stray `%` never throws.
 */
export function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * True if any contributed route pattern matches this absolute path exactly, i.e.
 * navigating there lands on a real route. Used to decide whether a breadcrumb
 * segment is clickable; a static label is not enough (its parent may be routeless).
 */
export function isRoutePath(resolvers: CrumbResolvers, path: string): boolean {
  return resolvers.routes.some((pattern) => matchPath({ path: pattern, end: true }, path) != null);
}

/** Fallback breadcrumb label for a path segment: "user-settings" -> "User Settings". */
export function titleCase(segment: string): string {
  return segment.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
