import type { Accent, Base } from "../context/themeConfig";

/**
 * Every piece of text the frame draws itself, in English. This is the only file in the
 * frame that holds that text. A host overrides any of it with `<AppFrame strings={...} />`.
 */
export const defaultStrings = {
  /** Settings crumb and the sidebar footer link. */
  settings: "Settings",
  /** Title of the frame-owned Appearance settings section. */
  appearance: "Appearance",
  appearanceDescription: "Theme and visual preferences.",
  theme: "Theme",
  light: "Light",
  dark: "Dark",
  system: "System",
  baseColor: "Base color",
  accentColor: "Accent color",
  layout: "Layout",

  layoutPopover: "Sidebar as popover menu",
  layoutPopoverDescription: "Hide the sidebar and open it from a menu button instead.",
  layoutHideWhenCollapsed: "Hide sidebar when collapsed",
  layoutHideWhenCollapsedDescription:
    "Collapsing the sidebar hides it fully instead of showing an icon rail.",
  layoutHoverReveal: "Hover-reveal sidebar",
  layoutHoverRevealDescription:
    "When collapsed, hide the sidebar and slide it out on hovering the left edge.",
  layoutCollapseWhenNarrow: "Collapse sidebar on narrow windows",
  layoutCollapseWhenNarrowDescription:
    "On a narrow window, the sidebar becomes a menu button and opens fullscreen.",
  layoutFloatingTopBar: "Floating top bar",
  layoutFloatingTopBarDescription:
    "The top bar loses its background and sits over the content as it scrolls.",
  layoutBreadcrumbCollapsed: "Collapse breadcrumb",
  layoutBreadcrumbCollapsedDescription: "Show only the current page; reveal the full path on hover.",
  layoutHistoryButtons: "Back/forward buttons",
  layoutHistoryButtonsDescription: "Show the back and forward navigation buttons in the top bar.",

  /** Colour names, keyed by the accent id. */
  accentNames: {
    neutral: "Default",
    blue: "Blue",
    green: "Green",
    rose: "Rose",
    violet: "Violet",
    orange: "Orange",
    red: "Red",
    amber: "Amber",
    yellow: "Yellow",
    teal: "Teal",
    cyan: "Cyan",
    sky: "Sky",
    indigo: "Indigo",
    purple: "Purple",
    pink: "Pink",
    rainbow: "Rainbow",
    opal: "Opal",
  } satisfies Record<Accent, string>,
  /** Colour names, keyed by the base id. */
  baseNames: {
    zinc: "Zinc",
    slate: "Slate",
    gray: "Gray",
    stone: "Stone",
    neutral: "Neutral",
    rose: "Rose",
    red: "Red",
    amber: "Amber",
    green: "Green",
    teal: "Teal",
    blue: "Blue",
    indigo: "Indigo",
    violet: "Violet",
    purple: "Purple",
    sky: "Sky",
    navy: "Navy",
    fuchsia: "Fuchsia",
    orange: "Orange",
    lime: "Lime",
    emerald: "Emerald",
    yellow: "Yellow",
    crimson: "Crimson",
  } satisfies Record<Base, string>,

  /** Screen reader title and description of a drawer that gives none. */
  drawer: "Drawer",

  menu: "Menu",
  toggleSidebar: "Toggle sidebar",
  back: "Back",
  forward: "Forward",
  revealSidebar: "Reveal sidebar",
  resizeSidebar: "Resize sidebar",
  closeMenu: "Close menu",
  noSettings: "No settings available.",
  noTools: "No tools available yet.",
  chooseTool: "Choose a tool to get started.",
};

/** The full table the frame reads from: every key present. */
export type ResolvedStrings = typeof defaultStrings;
