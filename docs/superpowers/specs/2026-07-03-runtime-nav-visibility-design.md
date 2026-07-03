# Runtime nav-item visibility — design

Date: 2026-07-03
Target: `@picoframe/frame` (Sidebar, new `NavGate` export), `@picoframe/plugin-sdk`
(`NavItem` gains one field). No CLI or crate changes.

## Problem

An app built on picoframe needs to show and hide sidebar menu items at runtime,
toggling them on and off. Two drivers, both owned by the **app**, not the frame:

- **End-user preference** — e.g. a "developer mode" toggle that reveals extra items,
  persisted across sessions.
- **App/plugin state** — items gated behind some application state (a feature flag, a
  licence, whether a document is open, connection status).

picoframe's job is to provide the *mechanism* (a reactive per-item visibility gate). The
app owns the *policy* (what state drives it) and the *control surface* (the toggle UI).

Additionally, hiding is **mixed** per item: some items are cosmetic (hide from the
sidebar only; the route still works if reached directly), and some are hard gates (the
route must also be unreachable while gated).

## What already exists

- Nav is composed once at assembly time: `AppFrame.tsx:67`
  `useMemo(() => composeNav(resolved), [resolved])`. Items are otherwise static.
- `NavItem` (`plugin-sdk/src/types.ts`) already carries two relevant fields:
  - `sidebar?: boolean` (default true) — a **static** opt-out, filtered in
    `Sidebar.tsx:157`; `false` means "home-launcher only, never a sidebar entry".
  - `badge?: () => ReactNode` — a function called *during render* (`Sidebar.tsx:65`).
    Note: `badge` is only *sampled at render*; it has no subscription of its own.
- A first-class **reactive keyed store** already ships: `store.subscribe(key, listener)`
  (`settings/store.ts`) with the React wrapper `usePersistentValue` / `useSetting`
  (`SettingsStoreProvider.tsx:43-52`) that re-renders subscribers when a key changes. A
  "developer mode" toggle sits naturally on this.
- Routes are built as lazy elements under `AppLayout` (`buildRoutes.tsx:26-29`). Each
  page component is authored by the app, so route gating needs no `buildRoutes` change —
  the app wraps its own page.
- Empty groups are already dropped from the sidebar (`Sidebar.tsx:158`), but that filter
  currently runs on the **static** `sidebar` flag only.

## Approach

Chosen: a **declarative predicate hook** on the nav item (approach A of three
considered). Rejected alternatives:

- **Imperative visibility registry** (frame owns a `Map<id, boolean>`, app pushes
  toggles) — creates two sources of truth (app state + registry) that must be kept
  mirrored; drifts easily.
- **`navFilter` prop on `AppFrame`** — coarse, forces app state above `AppFrame`, and
  does not cleanly gate routes.

The predicate hook keeps a **single source of truth in the app's own state** and lets the
frame subscribe through React's normal mechanism. It mirrors the existing
`badge: () => ReactNode` mental model, and the same predicate is reused for route gating
so nav and route can never disagree.

## Design

### 1. API surface — one new field on `NavItem`

In `plugin-sdk/src/types.ts`:

```ts
/**
 * Live visibility gate. A hook, evaluated in the item's own render, so it may
 * call useSetting / useContext / any hook. Return false to hide the item from
 * the sidebar. Default: always visible. Purely presentational — to also block
 * the route, wrap the page in <NavGate> using the same predicate.
 */
useVisible?: () => boolean;
```

`sidebar: false` (structural: never a sidebar entry) and `useVisible` (dynamic:
currently hidden) are distinct and non-overlapping; neither replaces the other.

### 2. Sidebar reactivity

`useVisible` is a hook, so it must be called in a stable order every render. The single
evaluation point is `NavGroupView`, which already receives the group's items:

- The static `sidebar !== false` filter stays where it is (`Sidebar.tsx:157`) — it does
  not involve a hook and runs before `NavGroupView` is rendered.
- Inside `NavGroupView`, map the (already statically-filtered) `group.items` to their
  live visibility: `const visible = group.items.filter((i) => i.useVisible?.() ?? true)`.
  This calls the hook once per item in a `.map`/`.filter` over a **statically-composed,
  memoized array** whose length and order are constant across renders (nav is composed
  once — `AppFrame.tsx:67`), which satisfies the rules of hooks. The `?.` call/skip
  pattern is stable per index because each index holds the same item object across
  renders. An `eslint-disable-next-line react-hooks/rules-of-hooks` with this
  justification covers the linter's loop heuristic.
- `NavGroupView` renders the header **and** the items from that `visible` subset, and
  returns `null` when `visible.length === 0`. So group auto-hide (header included) falls
  out of the same single evaluation.
- `NavItemView` stays a pure presentational component (no hook) — it only renders items
  the group already decided are visible.

This makes visibility reactive end-to-end: `useVisible` subscribes (via `useSetting` /
`useContext`) inside `NavGroupView`'s render, so flipping the backing state re-renders the
group.

### 3. Route gating — `<NavGate>`

A small component exported from `frame/src/index.ts`, wrapping the page an app wants to
hard-gate:

```tsx
export function NavGate({ use, redirectTo = "/", children }: {
  use: () => boolean;        // the same predicate the nav item uses
  redirectTo?: string;
  children: ReactNode;
}) {
  return use() ? <>{children}</> : <Navigate to={redirectTo} replace />;
}
```

Cosmetic items skip it (zero cost). Hard-gate items share the exact predicate between
`useVisible` and `NavGate`'s `use`, so the sidebar and the route stay consistent.

## Edge cases

- **Active item hides while on its route:** the sidebar entry vanishes. Hard gates
  redirect via `NavGate`; cosmetic items leave the user on the page with no sidebar
  highlight — intended.
- **All items in a group hidden:** the group header disappears (render-time empty check,
  §2).
- **Item with neither `sidebar: false` nor `useVisible`:** unchanged, always shown.

## Testing (Bun + Testing Library)

- An item with `useVisible` returning a state value is hidden/shown accordingly.
- A group vanishes (header included) when all its children resolve hidden.
- `NavGate` renders children when `use()` is true and redirects when false.
- Toggling the backing `useSetting` flag flips both the sidebar item and `NavGate`
  live (reactivity end-to-end).

## Scope

One new field, two component edits (`NavItemView`, `NavGroupView`), one new ~6-line
`NavGate` component, one export. No `AppFrame` prop, no registry, no `buildRoutes` change,
no CLI or crate changes.
