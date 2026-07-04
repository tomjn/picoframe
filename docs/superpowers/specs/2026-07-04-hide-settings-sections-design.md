# Hide settings sections — design

Date: 2026-07-04
Target: `@picoframe/plugin-sdk` (`SettingsSection` gains one field), `@picoframe/frame`
(`pages/Settings.tsx`). No CLI, crate, or `composeSettings` changes.

## Problem

Plugins can already hide screens from the home launcher and sidebar at runtime
(`NavItem.useVisible`, see `2026-07-03-runtime-nav-visibility-design.md`). But a hidden
screen still contributes its **settings section**, so the settings page offers controls
for a feature that appears to be missing — confusing.

This is deliberately **separate from route/nav hiding**: a plugin may want to hide some
of its settings (e.g. behind a "developer mode" flag) while the feature's screen stays
visible, or vice-versa. So settings visibility is its own gate, not a mirror of the nav
item's.

picoframe provides the *mechanism* (a reactive per-section gate); the app/plugin owns the
*policy* (what state drives it).

## What already exists

- `SettingsSection` (`plugin-sdk/src/types.ts:101`) is **fully static**: `id`, `title`,
  `order`, `description`, `icon`, `parent`, `Component`. No visibility gate.
- Sections are composed once into a tree by `composeSettings(plugins)`
  (`frame/src/settings/composeSettings.ts`), producing `{ nodes, byId }`. They merge by
  `id` and nest via `parent`. This runs in a `useMemo` in `AppFrame.tsx` — plain data, no
  per-section hook context.
- `pages/Settings.tsx` renders the model:
  - `NavNode` (recursive) — the left tree; **each node is its own fiber**
    (`node.children.map((child) => <NavNode … />)`).
  - `SectionContent` — the right panel. When a node has no `Component` but has children,
    it renders those children as **category cards inline** (`node.children.map((child) =>
    <li>…</li>)`), i.e. *not* in per-child fibers.
  - Default redirect: `/settings` → `settings.nodes[0]`.
- The reactive keyed store (`useSetting` / `usePersistentValue`) that backs a "developer
  mode" toggle already ships — same one the nav gate uses.

## Approach

Chosen: a **declarative predicate hook** `useVisible` on `SettingsSection`, mirroring
`NavItem.useVisible` exactly (naming, rules-of-hooks contract, and **soft** semantics —
purely presentational).

Rejected alternatives (already weighed with the user):

- **Static `hidden?: boolean` filtered in `composeSettings`** — cannot react to a runtime
  flag; a plugin wanting dev-mode gating would have to rebuild its settings array upfront.
- **Hard-gating the `/settings/<id>` route** (redirect on direct link) — more machinery
  than wanted. Hiding here is soft: the section stays reachable by direct link, exactly
  like `NavItem.useVisible` without `<NavGate>`.

Keeping the gate separate from the nav item's gate is the whole point of the feature, so
there is no shared predicate and no coupling to `NavItem`.

## Design

### 1. API surface — one new field on `SettingsSection`

In `plugin-sdk/src/types.ts`:

```ts
/**
 * Live visibility gate. A hook, evaluated in the section's own render within the
 * settings tree, so it may call useSetting / useContext / any hook. Return false to
 * hide the section (and its rendered subtree) from the settings navigation; default is
 * visible. Purely presentational and independent of the feature's nav item — the
 * section stays reachable at /settings/<id> by direct link. A given section id must
 * consistently define, or never define, useVisible (React's rules of hooks).
 */
useVisible?: () => boolean;
```

`composeSettings.ts` is **unchanged** — hidden sections stay in `nodes`/`byId` so direct
`/settings/<id>` links still resolve (the soft contract).

### 2. Consumption — `pages/Settings.tsx`

Two render sites gain the gate; both must keep the hook in a stable per-fiber order.

- **`NavNode` (left tree).** At the top of the component:
  ```ts
  const visible = node.useVisible ? node.useVisible() : true;
  if (!visible) return null;
  ```
  Each `NavNode` is its own fiber, so this is hook-safe even as sections mount/unmount at
  runtime. Returning `null` from a parent node also drops its rendered subtree from the
  tree (children are rendered inside the parent) — the natural, desired behaviour.

- **Category-card grid in `SectionContent`.** The inline `<li>…</li>` (currently
  `node.children.map(…)`) is extracted into a `SectionCard({ node })` component so each
  card is its own fiber, then gains the same guard:
  ```ts
  const visible = node.useVisible ? node.useVisible() : true;
  if (!visible) return null;
  ```
  Without the extraction, calling `useVisible` inside the `.map()` callback would be a
  hook-in-a-loop (call count varies with the children array) — a rules-of-hooks
  violation. This keeps a dev-hidden child from reappearing as a card on its parent's
  category page.

- **`SectionContent` panel itself — unchanged.** A direct `/settings/<id>` renders the
  section even when hidden. Soft contract.

### 3. Known limitation (by design)

The default redirect (`settings.nodes[0]`) is **not** visibility-filtered: visibility can
only be resolved during a node's own render, so scanning for "first visible" would mean
calling `useVisible` in a loop in the `Settings` component — the same violation. So
`/settings` could redirect to a hidden first node. Acceptable because hiding is soft (the
section is reachable anyway) and top-level categories (including the built-in Appearance)
are rarely the dev-gated ones. Documented in the type doc.

## Edge cases

- **Active section hides while viewing it:** the tree entry vanishes; the panel stays (no
  redirect — soft). The user keeps the page with no tree highlight — intended, mirrors the
  cosmetic nav item.
- **Parent section hidden:** its whole rendered subtree disappears from the tree and it
  contributes no card grid, since `NavNode`/`SectionCard` return `null` before recursing.
- **All top-level nodes hidden:** the left `nav` renders empty. Edge case (dev flag off);
  no special handling.
- **Section with no `useVisible`:** unchanged, always shown.

## Testing (Bun + Testing Library)

Mirror the nav `useVisible` tests:

- A section with `useVisible: () => false` is absent from the rendered tree.
- The same hidden section is absent from a parent's category-card grid.
- The hidden section still renders when navigated to directly (`/settings/<id>`).
- Toggling the backing `useSetting` flag flips the section's tree presence live
  (reactivity end-to-end).

## Scope

One new SDK field, two edits in `pages/Settings.tsx` (guard in `NavNode`; extract
`SectionCard` and guard it). No `composeSettings`, `AppFrame`, CLI, or crate changes.
