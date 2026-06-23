import type { FramePlugin, FrameRoute } from "@picoframe/plugin-sdk";

/** Join a base path and a (possibly multi-segment) child segment into an absolute path. */
function joinPath(base: string, seg: string): string {
  const cleaned = seg.replace(/^\/+|\/+$/g, "");
  if (!cleaned) return base || "/";
  return base === "/" || base === "" ? `/${cleaned}` : `${base}/${cleaned}`;
}

/**
 * Map absolute route paths to their optional `crumb` labels, so the top bar can
 * honor explicit breadcrumb labels without a React Router data router.
 */
export function buildCrumbMap(plugins: FramePlugin[]): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (routes: FrameRoute[], base: string) => {
    for (const r of routes) {
      const full = r.index ? base || "/" : joinPath(base, r.path ?? "");
      if (r.crumb) map.set(full, r.crumb);
      if (r.children) walk(r.children, full);
    }
  };
  walk(plugins.flatMap((p) => p.routes), "/");
  return map;
}

/** Fallback breadcrumb label for a path segment: "user-settings" -> "User Settings". */
export function titleCase(segment: string): string {
  return segment.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
