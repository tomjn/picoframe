import type { IconComponent } from "@picoframe/plugin-sdk";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import { SIDEBAR_NARROW_BREAKPOINT } from "../lib/useNarrowViewport";
import { usePersistentState } from "../lib/usePersistentState";

/**
 * A per-option "lock or expose" knob. A bare value locks the option (fixed, no user
 * control); the object form exposes it as a user-overridable setting seeded to `default`.
 * Mirrors — and extends — how `theme.defaultMode` seeds a value the user can then change.
 */
export type Configurable<T> = T | { default: T; userConfigurable?: boolean };

export interface OptionDescriptor<T> {
  default: T;
  /** Whether a user-facing control is shown (and a persisted override honoured). */
  exposed: boolean;
}

/** Layout behaviours configurable on `<AppFrame layout={...}>`. */
export interface LayoutConfig {
  sidebar?: {
    /** Collapse fully hides the sidebar instead of leaving an icon rail. */
    hideWhenCollapsed?: Configurable<boolean>;
    /** No persistent sidebar; a menu button opens it as an overlay popover. */
    popover?: Configurable<boolean>;
    /**
     * When collapsed, hide the sidebar fully and slide a floating panel out on hovering
     * the left edge (or the toggle button, or activating the edge trigger by keyboard).
     * Ignored when `popover` is on — that mode has no persistent sidebar to reveal from.
     */
    hoverReveal?: Configurable<boolean>;
    /**
     * Below {@link narrowBreakpoint}, drop the docked sidebar and open the nav from the top
     * bar's menu button as a fullscreen panel. Takes over from the docked and hover-reveal
     * modes only while the window is narrow, and never touches the persisted collapse state,
     * so widening restores whatever was there before.
     */
    collapseWhenNarrow?: Configurable<boolean>;
    /**
     * Viewport width (px) `collapseWhenNarrow` switches at, defaulting to 640. Static app
     * config: an app whose content needs more room can raise it so the sidebar gives way
     * sooner. Ignored while `collapseWhenNarrow` is off.
     */
    narrowBreakpoint?: number;
    /** In popover mode, the menu button's icon while closed (defaults to a hamburger menu). */
    menuIcon?: IconComponent;
    /** In popover mode, the menu button's icon while the popover is open (defaults to a chevron). */
    menuIconOpen?: IconComponent;
    /** In popover mode, the menu button's accessible label + tooltip (defaults to "Menu"). */
    menuLabel?: string;
    /** Render the menu label as visible text beside the icon (default false; icon-only). */
    menuLabelVisible?: boolean;
    /** Custom visible label content (e.g. an image/logo). Replaces the text when shown; `menuLabel` stays the accessible name. */
    menuLabelContent?: ReactNode;
  };
  topBar?: {
    /**
     * Drop the top bar's own background and float it over the content, which scrolls
     * beneath it. Frame-owned controls (menu, history, breadcrumb) get their own pill
     * backgrounds. Slot content is the app's to style, off the `data-floating` marker
     * on the header (target it with `group-data-[floating]/topbar:` classes).
     */
    floating?: Configurable<boolean>;
  };
  breadcrumb?: {
    /** Show only the current route header; reveal the full path on hover/focus. */
    collapsed?: Configurable<boolean>;
    /** Hide the breadcrumb region entirely (app config; overrides `collapsed`). */
    hidden?: boolean;
  };
  history?: {
    /** Show the back/forward navigation buttons in the top bar (default true). */
    buttons?: Configurable<boolean>;
  };
}

export interface ResolvedLayoutConfig {
  hideWhenCollapsed: OptionDescriptor<boolean>;
  popover: OptionDescriptor<boolean>;
  hoverReveal: OptionDescriptor<boolean>;
  collapseWhenNarrow: OptionDescriptor<boolean>;
  floatingTopBar: OptionDescriptor<boolean>;
  breadcrumbCollapsed: OptionDescriptor<boolean>;
  historyButtons: OptionDescriptor<boolean>;
  /** Hide the breadcrumb region entirely (static app config). */
  breadcrumbHidden: boolean;
  /** Width (px) `collapseWhenNarrow` switches at (static app config). */
  narrowBreakpoint: number;
  /** Static (app-author, not user-configurable) popover menu button overrides. */
  menuButton: {
    icon?: IconComponent;
    iconOpen?: IconComponent;
    label?: string;
    labelVisible?: boolean;
    labelContent?: ReactNode;
  };
}

/** The user-toggleable boolean options — deliberately excludes the static `menuButton`. */
export type LayoutOptionKey =
  | "hideWhenCollapsed"
  | "popover"
  | "hoverReveal"
  | "collapseWhenNarrow"
  | "floatingTopBar"
  | "breadcrumbCollapsed"
  | "historyButtons";

/** Resolve one `Configurable` into a descriptor. Bare value → locked; object → exposed. */
export function resolveOption<T>(cfg: Configurable<T> | undefined, fallback: T): OptionDescriptor<T> {
  if (cfg === undefined) return { default: fallback, exposed: false };
  if (typeof cfg === "object" && cfg !== null && "default" in cfg) {
    return { default: cfg.default, exposed: cfg.userConfigurable ?? true };
  }
  return { default: cfg, exposed: false };
}

/** User-facing labels for the exposed options, used by the Appearance settings. */
export const LAYOUT_OPTIONS: { key: LayoutOptionKey; label: string; description: string }[] = [
  {
    key: "popover",
    label: "Sidebar as popover menu",
    description: "Hide the sidebar and open it from a menu button instead.",
  },
  {
    key: "hideWhenCollapsed",
    label: "Hide sidebar when collapsed",
    description: "Collapsing the sidebar hides it fully instead of showing an icon rail.",
  },
  {
    key: "hoverReveal",
    label: "Hover-reveal sidebar",
    description: "When collapsed, hide the sidebar and slide it out on hovering the left edge.",
  },
  {
    key: "collapseWhenNarrow",
    label: "Collapse sidebar on narrow windows",
    description: "On a narrow window, the sidebar becomes a menu button and opens fullscreen.",
  },
  {
    key: "floatingTopBar",
    label: "Floating top bar",
    description: "The top bar loses its background and sits over the content as it scrolls.",
  },
  {
    key: "breadcrumbCollapsed",
    label: "Collapse breadcrumb",
    description: "Show only the current page; reveal the full path on hover.",
  },
  {
    key: "historyButtons",
    label: "Back/forward buttons",
    description: "Show the back and forward navigation buttons in the top bar.",
  },
];

const LayoutConfigContext = createContext<ResolvedLayoutConfig | null>(null);

export function LayoutConfigProvider({
  config,
  children,
}: {
  config?: LayoutConfig;
  children: ReactNode;
}) {
  const resolved = useMemo<ResolvedLayoutConfig>(
    () => ({
      hideWhenCollapsed: resolveOption(config?.sidebar?.hideWhenCollapsed, false),
      popover: resolveOption(config?.sidebar?.popover, false),
      hoverReveal: resolveOption(config?.sidebar?.hoverReveal, false),
      collapseWhenNarrow: resolveOption(config?.sidebar?.collapseWhenNarrow, false),
      floatingTopBar: resolveOption(config?.topBar?.floating, false),
      breadcrumbCollapsed: resolveOption(config?.breadcrumb?.collapsed, false),
      historyButtons: resolveOption(config?.history?.buttons, true),
      breadcrumbHidden: config?.breadcrumb?.hidden ?? false,
      narrowBreakpoint: config?.sidebar?.narrowBreakpoint ?? SIDEBAR_NARROW_BREAKPOINT,
      menuButton: {
        icon: config?.sidebar?.menuIcon,
        iconOpen: config?.sidebar?.menuIconOpen,
        label: config?.sidebar?.menuLabel,
        labelVisible: config?.sidebar?.menuLabelVisible,
        labelContent: config?.sidebar?.menuLabelContent,
      },
    }),
    [config],
  );
  return <LayoutConfigContext.Provider value={resolved}>{children}</LayoutConfigContext.Provider>;
}

export function useLayoutConfig(): ResolvedLayoutConfig {
  const ctx = useContext(LayoutConfigContext);
  if (!ctx) throw new Error("useLayoutConfig must be used within <AppFrame>");
  return ctx;
}

/**
 * Read the effective value of a layout option and, when the app exposed it, a setter.
 * Locked options return `[default, null]` — the setter is withheld so no UI can change
 * them. Exposed options persist the user's choice to localStorage (like theme/collapsed).
 */
export function useLayoutOption(key: LayoutOptionKey): [boolean, ((value: boolean) => void) | null] {
  const descriptor = useLayoutConfig()[key];
  const [persisted, setPersisted] = usePersistentState(`picoframe.layout.${key}`, descriptor.default);
  if (!descriptor.exposed) return [descriptor.default, null];
  return [persisted, setPersisted];
}
