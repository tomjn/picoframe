# Hide frame-owned settings sections — design

Date: 2026-07-04
Target: `@picoframe/frame` (`settingsPlugin.tsx` uses a new exported id constant;
`pages/Settings.tsx` gains a `FirstVisibleRedirect`; `index.ts` exports the constant),
`@picoframe/plugin-sdk` (one doc-comment correction only). No CLI or crate changes.

Follows `2026-07-04-hide-settings-sections-design.md`, which added
`SettingsSection.useVisible` for plugin-owned sections.

## Problem

`SettingsSection.useVisible` lets a plugin hide *its own* settings sections. But the
**Appearance** section (theme mode + accent) is frame-owned: `AppFrame` injects
`settingsPlugin()` unconditionally (`AppFrame.tsx:64`, `[...resolved, settingsPlugin()]`),
and that plugin contributes `frame.appearance` with the `AppearanceSettings` component
(`settingsPlugin.tsx:40-49`). An app never declares it, so it has no handle to hide it.

Concretely: an app that forces a fixed theme (e.g. dark + orange) wants to remove the
Appearance UI so users cannot change it. Today there is no clean way.

## What already exists

- `composeSettings` merges sections by `id`: first declarer wins, later declarations fill
  only unset fields via `??=`, **including `useVisible`** (added last feature,
  `composeSettings.ts:37`). This is a documented capability — "a plugin can attach a
  sub-section to a category it does not own."
- App plugins compose *before* `settingsPlugin()` (`AppFrame.tsx:64`), so a section an app
  declares for `frame.appearance` is the **first declarer**; `settingsPlugin`'s later
  declaration fills `Component`, `icon`, `order`, `description` but leaves the app's
  `useVisible` intact.
- `NavNode` and `SectionCard` in `pages/Settings.tsx` already self-hide on `useVisible`
  (each is its own fiber). So a merged `useVisible: () => false` already removes Appearance
  from the tree and any parent card grid.
- The one gap: the `/settings` index redirect targets `settings.nodes[0]` **unfiltered**
  (`Settings.tsx:92-98`). Appearance sorts first (`order: 10`), so soft-hiding it still
  lands the user on it by default — defeating the hide.

## Approach

Chosen: **reuse the plugin `useVisible` merge path for built-ins** (user decision over an
app-level `AppFrame` prop). Nothing new is needed to *express* the hide — the merge
already carries `useVisible`. Two supporting changes make it usable and correct:

1. Export a **stable id constant** so apps don't hard-code the `"frame.appearance"` string.
2. Fix the **default redirect** to skip hidden sections (user chose "redirect to first
   visible" over "tree + placeholder").

Rejected: an `AppFrame` `hideSettings` prop (app-level, static) — the user preferred
reusing the existing runtime `useVisible` mechanism. Rejected: making `SettingsSection.title`
optional so an override needs only `{ id, useVisible }` — it would weaken every normal
section declaration and force runtime guards in the sort/render paths; not worth saving one
repeated string.

## Design

### 1. Stable id constant

Add to `@picoframe/frame`'s public exports:

```ts
/** Id of the built-in, frame-owned Appearance (theme) settings section. Pass it as a
 *  section `id` with `useVisible: () => false` to hide the theme UI (e.g. when the app
 *  forces a fixed theme). */
export const FRAME_APPEARANCE_SETTINGS_ID = "frame.appearance";
```

`settingsPlugin.tsx` uses this constant for the section `id` instead of the inline string
(single source of truth). Exported from `frame/src/index.ts`.

### 2. Usage (documentation, not code)

An app hides Appearance by including a section that merges onto it, via any plugin it
passes to `AppFrame`:

```ts
import { FRAME_APPEARANCE_SETTINGS_ID } from "@picoframe/frame";

const themeLockPlugin: FramePlugin = {
  id: "app.theme-lock",
  version: "0",
  routes: [],
  settings: [{ id: FRAME_APPEARANCE_SETTINGS_ID, title: "Appearance", useVisible: () => false }],
};
```

`title` is required by the type and repeated here; harmless since the section is hidden.
`useVisible` may be dynamic (read `useSetting`) exactly like any plugin section.

### 3. `FirstVisibleRedirect` — hook-safe, flash-free index redirect

Replace the `/settings` index branch in `Settings.tsx` (currently `Navigate` to
`settings.nodes[0]`) with a recursive delegation chain, one fiber per top-level node:

```tsx
function FirstVisibleRedirect({ nodes }: { nodes: SettingsNode[] }) {
  const [node, ...rest] = nodes;
  if (!node) return <div className="p-8 text-muted-foreground">No settings available.</div>;
  const visible = node.useVisible ? node.useVisible() : true;
  if (visible) return <Navigate to={`/settings/${node.id}`} replace />;
  return <FirstVisibleRedirect nodes={rest} />;
}
```

The index branch becomes:

```tsx
if (!sectionId) return <FirstVisibleRedirect nodes={settings.nodes} />;
```

Why it is correct:
- **Hook-safe.** Each chain link is its own component instance (fiber). Within an instance
  `node` is fixed, so `node.useVisible ? node.useVisible() : true` is a stable single hook
  call across that instance's re-renders — never a hook-in-a-loop. Delegating to the next
  link mounts/unmounts a whole fiber, which React allows.
- **No flash.** React renders `<FirstVisibleRedirect nodes={rest} />` inline within the same
  render pass, so the chain resolves synchronously to the first visible node's `<Navigate>`
  in one commit. No effect/state round-trip.
- **Top-level only.** A hidden top-level node hides its subtree (established behaviour), so
  the chain correctly skips to the next top-level sibling. Redirecting to a visible pure
  grouping node (no `Component`) renders its category cards, unchanged from today.
- **All hidden / none** falls through to the existing "No settings available." message.

Reactivity: at `/settings`, toggling a backing `useSetting` re-renders the chain and
re-resolves the target. Once redirected to a concrete `/settings/<id>`, later visibility
changes do not yank the user (matches the soft contract).

### 4. Doc-comment correction (plugin-sdk)

`SettingsSection.useVisible`'s doc comment (`types.ts`) currently says the `/settings`
default redirect "is not visibility-filtered, so it may land on a hidden first section."
This fix makes that false. Update it to state the redirect skips hidden sections.

## Edge cases

- **Appearance hidden, other sections present:** `/settings` skips Appearance, lands on the
  next visible section. Direct `/settings/frame.appearance` still renders it (soft), as with
  any `useVisible` section.
- **Appearance is the only section and hidden:** `/settings` shows "No settings available."
  The sidebar-footer "Settings" link is out of scope (still shown); an app hiding its only
  section is not the target scenario.
- **Dynamic hide toggled while sitting at `/settings`:** chain re-resolves live.

## Testing (Bun + Testing Library, in `Settings.test.tsx`)

- A merged `frame.appearance` section with `useVisible: () => false` (declared by an
  app plugin, plus `settingsPlugin`) is absent from the tree AND `/settings` redirects
  past it to the next visible section — the end-to-end frame-owned-hide case.
- All top-level sections hidden → `/settings` shows "No settings available."
- Reactivity: toggling a `useSetting`-backed `useVisible` on the first section flips whether
  `/settings` lands on it.
- `settingsPlugin()` still contributes `frame.appearance` with the constant id (guard the
  id export/rename).

## Scope

One new `frame` export (id constant) consumed by `settingsPlugin.tsx`; one new
`FirstVisibleRedirect` component replacing the index redirect in `Settings.tsx`; one
`plugin-sdk` doc-comment correction; tests. No type changes, no `composeSettings` change,
no theming work, no CLI/crate changes.
