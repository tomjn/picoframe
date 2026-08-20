import type { FramePlugin, FrameRoute, RouteAppearance } from "@picoframe/plugin-sdk";
import { useLayoutEffect } from "react";
import { matchPath, useLocation } from "react-router";
import { useTheme } from "../context/theme";

/**
 * One route's forced appearance, keyed by its full pattern. `end` is false for a route
 * with children, so the appearance covers the subtree, and true for a leaf, so an index
 * route at "/" claims only "/" rather than the whole app.
 */
export interface AppearanceRule {
  pattern: string;
  end: boolean;
  appearance: RouteAppearance;
}

/** Join a base path and a (possibly multi-segment) child segment into an absolute path. */
function joinPath(base: string, seg: string): string {
  const cleaned = seg.replace(/^\/+|\/+$/g, "");
  if (!cleaned) return base || "/";
  return base === "/" || base === "" ? `/${cleaned}` : `${base}/${cleaned}`;
}

/**
 * Collect every route that forced an appearance, as patterns matched against the live
 * path. The theme lives above the router, so a route cannot hand its appearance upward
 * through context. Resolving it from the pathname is how the shell learns about it,
 * the same approach the breadcrumb resolvers take.
 */
export function buildAppearanceRules(plugins: FramePlugin[]): AppearanceRule[] {
  const rules: AppearanceRule[] = [];
  const walk = (rs: FrameRoute[], base: string) => {
    for (const r of rs) {
      const full = r.index ? base || "/" : joinPath(base, r.path ?? "");
      if (r.appearance) rules.push({ pattern: full, end: !r.children?.length, appearance: r.appearance });
      if (r.children) walk(r.children, full);
    }
  };
  walk(plugins.flatMap((p) => p.routes), "/");
  return rules;
}

/**
 * The appearance forced at this path, or null to follow the user's theme. The deepest
 * matching route wins, so a child can opt back out of an ancestor's choice.
 */
export function resolveAppearance(rules: AppearanceRule[], pathname: string): RouteAppearance | null {
  let winner: RouteAppearance | null = null;
  let depth = -1;
  for (const { pattern, end, appearance } of rules) {
    const match = matchPath({ path: pattern, end }, pathname);
    if (match && match.pathnameBase.length > depth) {
      depth = match.pathnameBase.length;
      winner = appearance;
    }
  }
  return winner;
}

/**
 * Applies the current route's forced appearance, and withdraws it on the way out.
 * Renders nothing. Mounted once inside the frame's router, above the layout.
 *
 * A layout effect, not a passive one, so the class is on the document before the new
 * route paints. A passive effect would show one frame of the previous appearance,
 * which is the flash this whole feature exists to remove.
 */
export function RouteAppearance({ rules }: { rules: AppearanceRule[] }) {
  const { pathname } = useLocation();
  const { setAppearanceOverride } = useTheme();
  const appearance = resolveAppearance(rules, pathname);

  useLayoutEffect(() => {
    setAppearanceOverride(appearance);
    return () => setAppearanceOverride(null);
  }, [appearance, setAppearanceOverride]);

  return null;
}
