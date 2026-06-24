# Settings area + side drawers — design

Date: 2026-06-24
Target release: picoframe 0.0.6 (`@picoframe/frame` 0.0.6, `@picoframe/plugin-sdk` 0.0.3)
Issues: [#1 Side drawers](https://github.com/tomjn/picoframe/issues/1), [#2 Settings](https://github.com/tomjn/picoframe/issues/2)

## Summary

Two independent additions to the frame, both extending the existing plugin
contribution model:

1. **Settings** — plugins register hierarchical, deep-linkable settings sections; the
   frame owns a `/settings` page that renders them, plus a frame-managed, pluggable
   settings store (`useSetting`).
2. **Side drawer** — a single, frame-managed modal drawer controlled imperatively via
   `useDrawer()`, so plugins request a consistent drawer instead of each building their
   own.

Both fit the patterns already in the codebase: contributions on `FramePlugin`, a
frame-owned route (like `home`), `Slot` injection, and `usePersistentState`.

---

## Feature A: Settings

### Manifest contribution

New type in `@picoframe/plugin-sdk` (`types.ts`):

```ts
export interface SettingsSection {
  /** Globally-unique, namespaced, path-safe id, e.g. "recoil.engine.graphics".
   *  This id is the stable hot-link key: the section is reachable at /settings/<id>. */
  id: string;
  title: string;
  order?: number;            // sibling sort within its parent; default 100
  description?: string;
  icon?: IconComponent;
  /** Nest under another section/category id. Omit for a top-level category.
   *  May reference a category owned by a different plugin (sections merge by id). */
  parent?: string;
  /** Renders the section's controls. Optional for pure grouping/category nodes. */
  Component?: ComponentType;
}
```

`FramePlugin` gains `settings?: SettingsSection[]`.

### Composition (`composeSettings`)

New `packages/frame/src/settings/composeSettings.ts`, mirroring `composeNav`:

- Gather `settings` from every resolved plugin.
- **Merge by `id`** across plugins: first declarer sets `title`/`order`/`icon`/
  `description`/`Component`; later declarations with the same id are merged
  (non-destructive — fill only unset fields). This lets a plugin attach subsections to
  a category another plugin (or the app) owns.
- Build a **tree** from `parent` references. Missing-parent (orphan) → treated as
  top-level, with a `console.error` in dev (same loud-logging convention as
  `composeNav`'s duplicate-id check).
- Sort siblings by `order` (default 100), then `title`.
- Returns `{ nodes: SettingsNode[]; byId: Map<string, SettingsNode> }` — `nodes` is the
  top-level list (each node has `children: SettingsNode[]`), `byId` gives O(1) deep-link
  lookup. References to `settings.nodes` / `settings.byId` below use this shape.

`id` must be path-safe (no `/`). `composeSettings` warns on ids containing `/`.

### Routing & page

The frame owns the settings route, contributed the same way `home` is. In
`AppFrame`, after composing settings:

```
const settings = composeSettings(resolved);
const resolvedWithSettings = settings.nodes.length
  ? [...resolved, settingsPlugin(settings)]   // adds the route + a sidebar.footer link
  : resolved;
```

`settingsPlugin(settings)` is a built-in (frame-internal) plugin contributing:

- A route `{ path: "settings", lazy: () => import SettingsPage }` **and**
  `{ path: "settings/:sectionId", lazy: () => import SettingsPage }`. Because routes are
  composed before `buildRoutes`, this nests under the existing `AppLayout` (sidebar +
  top bar are preserved).
- A `sidebar.footer` slot contribution: a `NavLink` to `/settings` (gear icon, label
  "Settings"). Only added when `settings.nodes.length > 0`.

The composed `settings` tree + lookup map is placed on the frame context
(`FrameProvider` value, alongside `nav`/`crumbs`) so `SettingsPage` can read it.

`SettingsPage` (`packages/frame/src/pages/Settings.tsx`):

- Two-pane layout: **left** = settings nav tree (categories → subsections, sorted),
  **right** = content pane.
- Reads `:sectionId` via `useParams`. Index `/settings` (no param) redirects to the
  first top-level section's id.
- Content pane renders the selected node's `Component` (+ `title`/`description`). A node
  with no `Component` (pure category) renders a list/links to its children.
- The left nav uses `NavLink to={/settings/<id>}`, so every node is **hot-linkable** —
  any code (a drawer, a page, the top bar) navigates with
  `navigate("/settings/<id>")` or a `NavLink`. Under HashRouter the shareable URL is
  `#/settings/<id>`.

### Settings store (`useSetting`) + pluggable storage

```ts
export interface SettingsStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}
```

- `AppFrame` gains `settingsStorage?: SettingsStorage`, defaulting to a `localStorage`
  adapter. Provided to the tree via a `SettingsStorageProvider` context. This is the
  "settings may be part of another app" escape hatch — an embedding app supplies its
  own backend (Tauri store, remote config, etc.).
- `useSetting<T>(key, defaultValue): [T, (value: T) => void]`:
  - On mount, reads `storage.get(key)`, JSON-parses, falls back to `defaultValue`.
  - `setValue` updates local React state, `storage.set(key, JSON.stringify(value))`,
    and notifies other live `useSetting(key)` instances via a tiny in-module pub/sub so
    multiple components bound to the same key stay in sync.
- Plugins render their own controls (frame `Button`/`Input`, registry components, native
  inputs) and bind them with `useSetting`. The frame does not render control widgets —
  per the chosen free-form `Component` model.

`key`s are the plugin's responsibility to namespace (e.g. `recoil.engine.graphics.vsync`).

---

## Feature B: Side drawer

### API

```ts
export interface DrawerOptions {
  content: ReactNode;
  side?: "left" | "right";  // default "right"
  title?: string;           // a11y + visible header
  description?: string;
  width?: string;           // CSS width, e.g. "24rem"; sensible default
}

export interface DrawerController {
  open(options: DrawerOptions): void;
  close(): void;
  isOpen: boolean;
}

export function useDrawer(): DrawerController;
```

Single, shared, frame-managed drawer. `open()` replaces current content; `close()`
dismisses.

### Implementation

- `packages/frame/src/drawer/DrawerProvider.tsx`: holds state
  `{ isOpen: boolean; options: DrawerOptions | null }` via `useReducer` (pure reducer —
  testable). Exposes the controller through context. Mounted in `AppFrame` around the
  routed app so `useDrawer()` works from any page/plugin.
- `packages/frame/src/drawer/DrawerHost.tsx`: rendered once inside `AppLayout` (within
  the frame chrome). Built on **Radix Dialog** (`import { Dialog } from "radix-ui"`):
  - `Dialog.Root open={isOpen} onOpenChange={(o) => !o && close()}` — gives esc-to-close,
    backdrop-click close, and focus trap for free.
  - `Dialog.Portal` → `Dialog.Overlay` (dimmed backdrop) + `Dialog.Content` fixed to the
    chosen side, full height, `width` (default e.g. `24rem`), slide-in/out animation via
    `data-[state]` + `data-[side]` Tailwind classes (matching the registry dialog's
    animation conventions).
  - `Dialog.Title` / `Dialog.Description` render `options.title`/`description` (a11y;
    when absent, a visually-hidden title is supplied to satisfy Radix).
  - Body renders `options.content`.

### New dependency

Adds **`radix-ui`** to `@picoframe/frame` `dependencies`. Justified: accessible overlay
primitives (focus trap, escape, scroll-lock) we should not hand-roll, and consistent
with picoframe's existing radix usage in the registry. Flagged as the one new runtime
dep in this release.

---

## Exports & packages

`@picoframe/frame` adds to `src/index.ts`:

```ts
export { useDrawer } from "./drawer/DrawerProvider";
export type { DrawerOptions, DrawerController } from "./drawer/DrawerProvider";
export { useSetting } from "./settings/useSetting";
export type { SettingsStorage } from "./settings/storage";
export type { SettingsSection } from "@picoframe/plugin-sdk"; // re-export for convenience
```

`@picoframe/plugin-sdk` adds the `SettingsSection` type and `settings?` on `FramePlugin`.

---

## Testing

The repo's tests are pure-logic `bun:test` with no DOM rendering, so:

- **`composeSettings`** — tree building, cross-plugin id merge, sibling sort
  (order then title), orphan-parent handling, path-unsafe id warning. Pure, fully tested.
- **Drawer reducer** — `open`/`close`/replace transitions tested directly (logic extracted
  from the provider).
- **Settings store** — `useSetting`'s read/parse/write/notify logic tested against an
  in-memory `SettingsStorage` mock (and the default localStorage adapter via a mock,
  since `localStorage` may be absent in the test env).

UI behavior (drawer animation, two-pane settings layout, deep-link navigation) is verified
by running the demo app (`bun run dev`) — no React Testing Library exists in the repo, and
adding one is out of scope.

## Demo

A **demo-local** plugin in `apps/demo` (not the published `hello`) exercises both:

- Registers a `general` category + an `general.appearance` subsection with a toggle bound
  to `useSetting`, plus a second top-level category — demonstrating hierarchy and the
  cross-plugin `parent` merge.
- A button (e.g. in a `topbar.right` slot or a page) that calls
  `useDrawer().open(...)`, including a link inside the drawer that deep-navigates to
  `/settings/general.appearance` — demonstrating hot-linking from a drawer.

## Release

- `@picoframe/plugin-sdk` → **0.0.3** (new `SettingsSection` type + `settings?` field).
- `@picoframe/frame` → **0.0.6** (implementation + `radix-ui` dep).
- Build order: `plugin-sdk` then `frame`. Demo consumes both via `workspace:*`.
- `hello` plugin and crates unchanged.

## Non-goals (this release)

- Declarative control descriptors (frame-rendered widgets) — deferred; free-form
  `Component` only.
- Centralized settings schema/validation, import/export, or sync.
- Multiple simultaneous drawers, non-modal/push drawers, or declarative drawer panels.
- React Testing Library / DOM-rendering test harness.
