# Layout config options: sidebar, breadcrumb, welcome grid

Date: 2026-07-11

## Problem

Two unrelated asks against the frame's chrome:

1. The default launcher ("welcome screen") lays tool cards on a CSS grid where each card stretches edge-to-edge in its cell. Cards should size to a fixed/minimum width and pack left instead of filling columns.
2. New configurable behaviours for the top nav bar and sidebar:
   - Breadcrumb that shows only the current route header, expanding to the full path on hover.
   - Sidebar that fully hides when collapsed (instead of the icon rail).
   - Sidebar presented as a popover panel opened from a menu button (no persistent sidebar).

## Config model

Each new option is **per-option lock-or-expose**, seeded by a developer-time prop and optionally overridable by the end user (mirrors, and extends, `theme.defaultMode`).

```ts
export type Configurable<T> = T | { default: T; userConfigurable?: boolean };
```

- Bare value (`popover: true`) → **locked**: fixed at that value, no user control shown.
- Object (`popover: { default: false, userConfigurable: true }`) → **exposed**: seeded to `default`, user toggles it in Settings > Appearance.

`resolveOption(cfg, fallback) => { default, exposed }`:
- `undefined` → `{ default: fallback, exposed: false }`
- object with `default` → `{ default: cfg.default, exposed: cfg.userConfigurable ?? true }`
- bare value → `{ default: value, exposed: false }`

`useLayoutOption(key, descriptor) => [value, setter | null]`:
- locked → `[descriptor.default, null]` (setter withheld)
- exposed → `[persisted ?? default, setter]`, backed by `usePersistentState("picoframe.layout.<key>")` (localStorage, matching theme/sidebar-collapsed persistence, **not** the store).

## AppFrame API

New `layout` prop, sibling to `theme`. All defaults preserve current behaviour (rail sidebar, no popover, full breadcrumb).

```ts
layout?: {
  sidebar?: {
    hideWhenCollapsed?: Configurable<boolean>;  // default false → icon rail
    popover?: Configurable<boolean>;            // default false
  };
  breadcrumb?: {
    collapsed?: Configurable<boolean>;          // default false → full path
  };
};
```

A new `LayoutConfigProvider` (seeded from the prop) resolves descriptors and exposes them via context so both `AppLayout` (behaviour) and `AppearanceSettings` (toggles) read one source. `Configurable` and the `layout` prop type are exported from the frame's public entry.

## Sidebar behaviours

Independent booleans with a defined precedence: **popover wins**. When popover is on, `hideWhenCollapsed` is moot.

- **hideWhenCollapsed**: when `collapsed && hideWhenCollapsed`, `<aside>` animates to `w-0` `border-r-0`; inner nav/footer are **not rendered** so links leave the tab order (avoids invisible-but-tabbable a11y trap). TopBar toggle still shows/hides.
- **popover**: `AppLayout` drops the persistent `<aside>`; content is full-width. TopBar menu button toggles an ephemeral `open` state rendering `SidebarPopover` (left overlay panel + backdrop). Closes on backdrop click, Escape, and route change. The nav list + footer are extracted into a shared `SidebarNav` used by both the persistent `Sidebar` and the popover.

## Breadcrumb collapse-on-hover

When `breadcrumb.collapsed` and crumbs > 1: show only the current (last) route header. Ancestors sit in a wrapper animated via CSS `grid-cols-[0fr]` → `group-hover:grid-cols-[1fr]` / `group-focus-within:grid-cols-[1fr]`, keeping them in the DOM and focusable (keyboard tab-in reveals) rather than `hidden` (drops from a11y tree). Known limitation: touch has no hover, so it stays collapsed unless focused.

## Welcome screen fix (not configurable)

`pages/Home.tsx`: replace `grid sm:grid-cols-2 lg:grid-cols-3` with `flex flex-wrap gap-3`; cards get `w-full sm:w-64` on the shared `cardClass` (drop `w-full` from the external-link variant so both match). Full-width single column on phones; fixed 16rem non-stretching cards that pack left and wrap on larger screens.

## Settings UI

`AppearanceSettings` renders a labeled toggle for each **exposed** option (locked ones skipped), wired through `useLayoutOption`.

## Testing

- Unit: `resolveOption` locked vs exposed.
- Component: hidden-on-collapse omits nav content; popover opens/closes on button/Escape/route-change; collapsed breadcrumb keeps ancestors in DOM; welcome cards carry fixed-width class; Appearance shows toggles only for exposed options.

## New / changed files

New:
- `context/layoutConfig.tsx` — `Configurable`, `resolveOption`, `LayoutConfigProvider`, `useLayoutConfig`, `useLayoutOption`.
- `layout/SidebarNav.tsx` — shared nav list + footer.
- `layout/SidebarPopover.tsx` — overlay popover.

Changed:
- `AppFrame.tsx` — `layout` prop, wrap `LayoutConfigProvider`, export types.
- `layout/AppLayout.tsx` — resolve options, branch popover/hideWhenCollapsed, wire toggle handler.
- `layout/Sidebar.tsx` — `hideWhenCollapsed`, use `SidebarNav`.
- `layout/TopBar.tsx` — `breadcrumbCollapsed` rendering.
- `settings/AppearanceSettings.tsx` — toggles for exposed options.
- frame public entry — export `Configurable` / `LayoutConfig` types.
