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
  patterns: { pattern: string; crumb: string | string[] | CrumbFn }[];
  /**
   * Full pattern of every contributed route (with or without a `crumb`), so a
   * breadcrumb segment can be tested for navigability. A static label alone does
   * not imply a route — parent segments may be labeled but have nowhere to go.
   */
  routes: string[];
  /**
   * Patterns of the routes that declared a `crumbSpan` above 1, so the bar knows
   * how many trailing segments one crumb covers. Only multi-segment routes appear
   * here. Everything else spans a single segment.
   */
  spans: { pattern: string; span: number }[];
}

/**
 * Build the breadcrumb resolvers from every plugin's static `crumbs` map and the
 * `crumb` on each contributed route. Replaces the old flat string map so the top
 * bar can honor both explicit parent labels and param-aware label functions
 * without a React Router data router.
 */
export function buildCrumbResolvers(plugins: FramePlugin[]): CrumbResolvers {
  const staticMap = new Map<string, string | string[]>();
  const patterns: { pattern: string; crumb: string | string[] | CrumbFn }[] = [];
  const routes: string[] = [];
  const spans: { pattern: string; span: number }[] = [];

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
      if (r.crumbSpan !== undefined && r.crumbSpan > 1) spans.push({ pattern: full, span: r.crumbSpan });
      if (r.children) walk(r.children, full);
    }
  };
  walk(plugins.flatMap((p) => p.routes), "/");

  return { static: staticMap, patterns, routes, spans };
}

/**
 * Resolve one path, and say whether the answer came from a `CrumbFn`.
 *
 * The flag is what makes a crumb able to follow a rename: a function may read
 * anything, including a value the user is about to change, so the bar has to
 * re-resolve when the store is written. A string or an array cannot change, so a
 * path made only of those needs no subscription at all.
 */
function resolveEntry(
  resolvers: CrumbResolvers,
  path: string,
): { label: string | string[] | undefined; dynamic: boolean } {
  const fromStatic = resolvers.static.get(path);
  if (fromStatic !== undefined) return { label: fromStatic, dynamic: false };
  for (const { pattern, crumb } of resolvers.patterns) {
    const match = matchPath({ path: pattern, end: true }, path);
    if (!match) continue;
    if (typeof crumb === "function") {
      return { label: crumb({ params: match.params, pathname: path }), dynamic: true };
    }
    return { label: crumb, dynamic: false };
  }
  return { label: undefined, dynamic: false };
}

/**
 * Resolve the breadcrumb label for one absolute path: a static label wins, else
 * the first route pattern that matches (calling a `CrumbFn` with the matched
 * params), else `undefined` so the caller can fall back to `titleCase`.
 */
export function resolveCrumb(resolvers: CrumbResolvers, path: string): string | string[] | undefined {
  return resolveEntry(resolvers, path).label;
}

/**
 * How many trailing URL segments the crumb at this path stands for. 1 unless a
 * route declared a larger `crumbSpan`, in which case the caller drops the crumbs
 * it already emitted for the segments now covered by this one.
 */
export function resolveCrumbSpan(resolvers: CrumbResolvers, path: string): number {
  for (const { pattern, span } of resolvers.spans) {
    if (matchPath({ path: pattern, end: true }, path)) return span;
  }
  return 1;
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

/** One rendered breadcrumb. `to` is set only when it leads somewhere you can go. */
export interface Crumb {
  label: string;
  to?: string;
}

/**
 * The whole breadcrumb trail for a path, plus whether any of it came from a
 * `CrumbFn`. Pure: the same resolvers and path give the same answer, so it can be
 * called on every render and the caller decides what to subscribe to.
 */
export function buildCrumbTrail(
  resolvers: CrumbResolvers,
  pathname: string,
): { crumbs: Crumb[]; dynamic: boolean } {
  // Cumulative breadcrumbs from the path, honoring static parent labels and per-route
  // `crumb` (string or param-aware function), else title-case. Each crumb carries `to`
  // only when the accumulated path is a real, non-current route, so ancestors you can
  // navigate to become clickable and the rest stay plain text.
  const crumbs: Crumb[] = [];
  const segments = pathname.split("/").filter(Boolean);
  // Where each segment's crumbs begin, so a `crumbSpan` route can rewind past the
  // segments it covers. A segment may contribute more than one crumb, so this has to
  // be an index into `crumbs` rather than a count of segments.
  const crumbStart: number[] = [];
  let dynamic = false;
  let acc = "";
  segments.forEach((rawSeg, i) => {
    // `pathname` is URL-encoded (spaces -> %20), so decode it. Lookups then match the
    // unencoded route and crumb definitions, and the fallback label reads cleanly.
    const seg = decodeSegment(rawSeg);
    acc += `/${seg}`;
    // A route may claim several trailing segments as one merged crumb, dropping the
    // crumbs already emitted for the segments it now covers, so `/acme/repo` reads as
    // a single "acme/repo" rather than "Acme / acme/repo".
    const span = resolveCrumbSpan(resolvers, acc);
    if (span > 1) {
      crumbs.length = Math.min(crumbs.length, crumbStart[Math.max(0, i - (span - 1))] ?? crumbs.length);
    }
    crumbStart.push(crumbs.length);
    const isCurrent = i === segments.length - 1;
    const to = !isCurrent && isRoutePath(resolvers, acc) ? acc : undefined;
    const entry = resolveEntry(resolvers, acc);
    if (entry.dynamic) dynamic = true;
    // A label may expand one segment into several crumbs, e.g. settings ancestry. Only
    // the final piece maps to the accumulated path, so only it can link.
    if (Array.isArray(entry.label)) {
      const labels = entry.label;
      labels.forEach((l, j) => crumbs.push({ label: l, to: j === labels.length - 1 ? to : undefined }));
    } else {
      crumbs.push({ label: entry.label ?? titleCase(seg), to });
    }
  });
  if (crumbs.length === 0) {
    const root = resolveEntry(resolvers, "/");
    if (root.dynamic) dynamic = true;
    if (typeof root.label === "string") crumbs.push({ label: root.label });
  }
  return { crumbs, dynamic };
}

/** Fallback breadcrumb label for a path segment: "user-settings" -> "User Settings". */
export function titleCase(segment: string): string {
  return segment.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
