# Runtime-dynamic nav-item label / description / icon — design

Date: 2026-07-03
Target: `@picoframe/plugin-sdk` (new `NavItem` fields), `@picoframe/frame` (sidebar +
welcome-launcher rendering). No CLI or crate changes.

## Problem

An app needs nav items whose **label, description, and icon change at runtime**. The
motivating case: a temporary route named after a live domain object appears in the nav,
its label/description/icon reflecting that object, and it disappears (`useVisible → false`)
once the object is resolved. The item's **path is static** — routing is unchanged; only
the presentation is dynamic.

Separately, the welcome-launcher cards currently show each item's **path** as sub-text.
That path text should be replaced by a **description**: show the description when present,
show nothing when absent. Paths still work for navigation; they are just no longer
displayed on the launcher.

## What already exists

- `NavItem` (`plugin-sdk/src/types.ts`): `label: string` (static), `icon?: IconComponent`
  (static), `badge?: () => ReactNode`, and `useVisible?: () => boolean` (a reactive
  per-item hook added in the prior feature).
- `NavItemView` (`frame/src/layout/Sidebar.tsx`) renders each sidebar item in its own
  keyed component, already evaluating `useVisible` and rendering `label`, `icon`, `badge`.
- `ToolCard` (`frame/src/pages/Home.tsx`) renders each welcome-launcher card in its own
  keyed component, already evaluating `useVisible`, and shows `item.href ?? item.to` as
  the card sub-text.
- Established pattern: a `use*` hook, called at the top of the item's own component, is
  reactive (subscribes via `useSetting` / `useContext`) and hook-safe because each item is
  its own fiber.

## API

New fields on `NavItem`, mirroring the `useVisible` pattern:

```ts
/** Static card description (welcome launcher only), rendered in place of the path. */
description?: ReactNode;
/** Reactive label override; when present it replaces the static `label`. */
useLabel?: () => string;
/** Reactive description override; when present it replaces the static `description`. */
useDescription?: () => ReactNode;
/** Reactive icon override; when present it replaces the static `icon`. */
useIcon?: () => IconComponent;
```

- `label` stays required-static with `useLabel` as the optional reactive override.
- `icon` stays optional-static with `useIcon` as the optional reactive override.
- `description` is optional-static (for routes whose description never changes) with
  `useDescription` as the optional reactive override.
- `badge` is unchanged (see below).

Documented constraint (same as `useVisible`, rules of hooks): a given item `id` must
consistently have-or-not-have each `use*` hook across its lifetime. Items may be
added/removed at runtime freely; a single item must not flip whether a given hook exists.

## Rendering

A shared internal hook resolves every per-item value in one fixed hook-call order, so both
render sites stay DRY and hook-safe:

```ts
function useResolvedNavItem(item: NavItem) {
  return {
    visible:     item.useVisible ? item.useVisible() : true,
    label:       item.useLabel ? item.useLabel() : item.label,
    icon:        item.useIcon ? item.useIcon() : item.icon,
    description: item.useDescription ? item.useDescription() : item.description,
  };
}
```

- **`NavItemView` (sidebar):** call `useResolvedNavItem(item)` at the top; early-return
  `null` when `!visible`; render the resolved `label` and `icon`. `badge` rendering is
  unchanged. `description` is ignored here.
- **`ToolCard` (welcome launcher):** call `useResolvedNavItem(item)` at the top;
  early-return `null` when `!visible`; render the resolved `label` and `icon`. Replace the
  current path sub-text with the resolved description:
  `{description != null && <span className="block truncate text-xs text-muted-foreground">{description}</span>}`.
  When there is no description, nothing renders in that slot — the path is no longer shown.

The resolver deliberately evaluates every `use*` hook even where a surface ignores the
result (the sidebar computes `description` it will not render). Hooks must run
unconditionally per fiber; the extra subscription is negligible and is what lets one shared
resolver serve both surfaces safely.

### Behavior change

Welcome-launcher cards no longer display the route path. Items with neither a
`description` nor a `useDescription` show only their label (and icon). This is the
intended replacement of path-text by description.

## Badges — no change needed

`badge?: () => ReactNode` is already invoked inside `NavItemView`'s render, so a `badge`
that reads `useSetting` / `useContext` already re-renders live. No new API. The plan adds a
test proving badge reactivity and documents it; it builds nothing for badges. Badges remain
sidebar-only and hidden in the collapsed sidebar (existing behavior).

## Testing (Bun + happy-dom + RTL)

- Sidebar: `useLabel` overrides the static label; `useIcon` overrides the static icon;
  toggling a backing `useSetting` flips the rendered label live; a `badge` that reads a
  `useSetting` updates live.
- Welcome launcher: a static `description` renders as the card sub-text; `useDescription`
  overrides it and updates live; an item with neither renders no sub-text and no path;
  `useLabel` / `useIcon` apply to the card.

## Scope

New `NavItem` fields in `@picoframe/plugin-sdk`; a shared resolver hook plus edits to
`NavItemView` and `ToolCard` in `@picoframe/frame`. No `AppFrame` prop, no CLI/crate/store
change. Release bumps both changed published packages (`plugin-sdk`, `frame`).
