import type { DrawerContainer, DrawerDirection, DrawerSize } from "./reducer";

/**
 * Pure layout maths for the drawer, extracted so the direction/size → CSS-class decision
 * and the container-resolution precedence are unit-testable without a DOM (the JSX in
 * DrawerHost stays a thin shell). Mirrors the reducer-extraction pattern used elsewhere.
 */

/** Named side-sheet widths (left/right). "full" fills the portal target. */
const SIDE_SIZES: Record<DrawerSize, string> = {
  sm: "20rem",
  md: "24rem",
  lg: "32rem",
  full: "100%",
};

/** Named bottom-sheet heights. "full" fills the portal target. */
const BOTTOM_SIZES: Record<DrawerSize, string> = {
  sm: "12rem",
  md: "50%",
  lg: "75%",
  full: "100%",
};

export interface DrawerStyle {
  /** Positioning + edge-border + slide-animation classes for `Dialog.Content`. */
  contentClass: string;
  /** Inline `width` (side sheets) or `height` (bottom sheet) from the named size. */
  sizeStyle: { width?: string; height?: string };
}

/**
 * Resolve the drawer's `Dialog.Content` classes + inline size for a direction/size pair.
 * `contained` swaps `fixed` (viewport, default body portal) for `absolute` (scoped to a
 * positioned container) so the panel and its overlay stay inside the target element.
 */
export function drawerStyle(
  direction: DrawerDirection,
  size: DrawerSize,
  contained: boolean,
): DrawerStyle {
  const anchor = contained ? "absolute" : "fixed";
  switch (direction) {
    case "bottom":
      return {
        contentClass:
          `${anchor} inset-x-0 bottom-0 max-h-[90%] rounded-t-xl border-t border-border ` +
          "data-[state=closed]:animate-[pf-drawer-out-bottom_200ms_ease-in] " +
          "data-[state=open]:animate-[pf-drawer-in-bottom_300ms_ease-out]",
        sizeStyle: { height: BOTTOM_SIZES[size] },
      };
    case "left":
      return {
        contentClass:
          `${anchor} inset-y-0 left-0 max-w-[90%] border-r border-border ` +
          "data-[state=closed]:animate-[pf-drawer-out-left_200ms_ease-in] " +
          "data-[state=open]:animate-[pf-drawer-in-left_300ms_ease-out]",
        sizeStyle: { width: SIDE_SIZES[size] },
      };
    default:
      return {
        contentClass:
          `${anchor} inset-y-0 right-0 max-w-[90%] border-l border-border ` +
          "data-[state=closed]:animate-[pf-drawer-out-right_200ms_ease-in] " +
          "data-[state=open]:animate-[pf-drawer-in-right_300ms_ease-out]",
        sizeStyle: { width: SIDE_SIZES[size] },
      };
  }
}

/**
 * Resolve the portal target, applying the "both" precedence the issue calls for:
 * a per-open `container` wins over the provider-level default, falling back to `null`
 * (Radix's default = `document.body`). Function containers are called lazily so the
 * target can mount after the provider.
 */
export function resolveContainer(
  option: DrawerContainer | undefined,
  providerDefault: DrawerContainer | undefined,
): HTMLElement | null {
  const chosen = option ?? providerDefault ?? null;
  const el = typeof chosen === "function" ? chosen() : chosen;
  return el ?? null;
}
