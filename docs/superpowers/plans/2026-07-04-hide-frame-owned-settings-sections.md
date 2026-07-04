# Hide Frame-Owned Settings Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an app hide the frame-owned Appearance settings section by merging `useVisible` onto it via a stable exported id, and make the `/settings` default redirect skip hidden sections so the hide actually takes effect.

**Architecture:** No new hiding API — the existing `composeSettings` merge already carries `useVisible` onto a section an app re-declares by id (app plugins compose before the built-in `settingsPlugin`). Two supporting changes: (1) export `FRAME_APPEARANCE_SETTINGS_ID` so apps don't hard-code the string; (2) replace the unfiltered `/settings` index redirect (`settings.nodes[0]`) with a hook-safe recursive `FirstVisibleRedirect` that lands on the first *visible* top-level section.

**Tech Stack:** TypeScript, React 19, react-router 7, Bun test runner (`bun:test`) + `@testing-library/react` with happy-dom (preloaded via root `bunfig.toml`).

---

## Spec

Design doc: `docs/superpowers/specs/2026-07-04-hide-frame-owned-settings-sections-design.md`.

## Conventions (read before starting)

- Run tests from the **repo root** so `bunfig.toml`'s happy-dom preload gives a DOM: `bun test <path>`. Running from inside `packages/frame` fails with `document is not defined`.
- The `SettingsSection.useVisible` field and the `NavNode`/`SectionCard` self-hiding already exist (previous feature). `composeSettings` already merges `useVisible` via `existing.useVisible ??= s.useVisible`. Do not re-add those.
- `Settings.tsx` already imports `Navigate` (from `react-router`) and the `SettingsNode` type (from `../settings/composeSettings`) — `FirstVisibleRedirect` needs no new imports.

## File map

- `packages/frame/src/settings/settingsPlugin.tsx` — **modify**: define+use `FRAME_APPEARANCE_SETTINGS_ID`.
- `packages/frame/src/index.ts` — **modify**: re-export the constant.
- `packages/frame/src/settings/settingsPlugin.test.ts` — **create**: constant + merge-hide tests.
- `packages/frame/src/pages/Settings.tsx` — **modify**: add `FirstVisibleRedirect`, replace the index redirect branch.
- `packages/frame/src/pages/Settings.test.tsx` — **modify**: append index-redirect tests + a `renderIndex` helper.
- `packages/plugin-sdk/src/types.ts` — **modify**: correct one now-stale sentence in the `SettingsSection.useVisible` doc comment.

---

## Task 1: Export a stable id for the frame-owned Appearance section

**Files:**
- Modify: `packages/frame/src/settings/settingsPlugin.tsx`
- Modify: `packages/frame/src/index.ts`
- Test: `packages/frame/src/settings/settingsPlugin.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `packages/frame/src/settings/settingsPlugin.test.ts`:

```ts
import { expect, test } from "bun:test";
import type { FramePlugin } from "@picoframe/plugin-sdk";
import { composeSettings } from "./composeSettings";
import { FRAME_APPEARANCE_SETTINGS_ID, settingsPlugin } from "./settingsPlugin";

test("exposes the appearance section id as a stable constant", () => {
  expect(FRAME_APPEARANCE_SETTINGS_ID).toBe("frame.appearance");
  const ids = settingsPlugin().settings?.map((s) => s.id) ?? [];
  expect(ids).toContain(FRAME_APPEARANCE_SETTINGS_ID);
});

test("an app can hide the frame-owned appearance section by merging useVisible onto it", () => {
  const appPlugin: FramePlugin = {
    id: "app.theme-lock",
    version: "0",
    routes: [],
    settings: [{ id: FRAME_APPEARANCE_SETTINGS_ID, title: "Appearance", useVisible: () => false }],
  };
  // App plugin composes before settingsPlugin(), so it is the first declarer.
  const composed = composeSettings([appPlugin, settingsPlugin()]);
  const node = composed.byId.get(FRAME_APPEARANCE_SETTINGS_ID);
  expect(node?.useVisible?.()).toBe(false); // app's useVisible survives the merge
  expect(node?.Component).toBeDefined();     // settingsPlugin still fills the Component
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/frame/src/settings/settingsPlugin.test.ts`
Expected: FAIL — `FRAME_APPEARANCE_SETTINGS_ID` is not exported yet (import/compile error counts as red).

- [ ] **Step 3: Add and use the constant**

In `packages/frame/src/settings/settingsPlugin.tsx`, add the constant just below the imports (above `SettingsFooterLink`):

```tsx
/** Id of the built-in, frame-owned Appearance (theme) settings section. Declare a section
 *  with this `id` and `useVisible: () => false` from any plugin you pass to `AppFrame` to
 *  hide the theme UI (e.g. when the app forces a fixed theme). */
export const FRAME_APPEARANCE_SETTINGS_ID = "frame.appearance";
```

In the same file, change the section's `id` from the inline string to the constant:

```tsx
    settings: [
      {
        id: FRAME_APPEARANCE_SETTINGS_ID,
        title: "Appearance",
```

In `packages/frame/src/index.ts`, add the re-export (place it near the other settings exports, after the `storage` export block):

```ts
export { FRAME_APPEARANCE_SETTINGS_ID } from "./settings/settingsPlugin";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/frame/src/settings/settingsPlugin.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/frame/src/settings/settingsPlugin.tsx packages/frame/src/index.ts packages/frame/src/settings/settingsPlugin.test.ts
git commit -m "feat: export FRAME_APPEARANCE_SETTINGS_ID for hiding the built-in theme section"
```

---

## Task 2: Redirect `/settings` to the first *visible* section

**Files:**
- Modify: `packages/frame/src/pages/Settings.tsx` (add `FirstVisibleRedirect`; replace the index branch)
- Modify: `packages/plugin-sdk/src/types.ts` (correct the now-stale doc sentence)
- Test: `packages/frame/src/pages/Settings.test.tsx` (append)

- [ ] **Step 1: Write the failing tests**

Append to `packages/frame/src/pages/Settings.test.tsx`. First add a helper next to the existing `renderAt` (reuse the existing imports; `Route`/`Routes`/`MemoryRouter` are already imported):

```tsx
function renderIndex(settings: ComposedSettings) {
  return render(
    <MemoryRouter initialEntries={["/settings"]}>
      <FrameProvider value={{ settings } as unknown as FrameContextValue}>
        <Routes>
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/:sectionId" element={<Settings />} />
        </Routes>
      </FrameProvider>
    </MemoryRouter>,
  );
}
```

Then append these tests:

```tsx
test("/settings skips a hidden first section and lands on the next visible one", () => {
  const settings = compose([
    { id: "a", title: "Appearance", order: 10, useVisible: () => false, Component: () => <div>THEME UI</div> },
    { id: "b", title: "General", order: 100, Component: () => <div>GENERAL UI</div> },
  ]);
  renderIndex(settings);
  expect(screen.getByText("GENERAL UI")).toBeTruthy();
  expect(screen.queryByText("THEME UI")).toBeNull();
});

test("/settings lands on the first section when it is visible", () => {
  const settings = compose([
    { id: "a", title: "Appearance", order: 10, Component: () => <div>THEME UI</div> },
    { id: "b", title: "General", order: 100, Component: () => <div>GENERAL UI</div> },
  ]);
  renderIndex(settings);
  expect(screen.getByText("THEME UI")).toBeTruthy();
});

test("/settings shows the placeholder when every section is hidden", () => {
  const settings = compose([
    { id: "a", title: "Appearance", useVisible: () => false },
    { id: "b", title: "General", useVisible: () => false },
  ]);
  renderIndex(settings);
  expect(screen.getByText("No settings available.")).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/frame/src/pages/Settings.test.tsx`
Expected: The first ("skips a hidden first section") and third ("placeholder when every section is hidden") FAIL — the current index redirect targets `settings.nodes[0]` unconditionally, so it lands on the hidden section `a` (rendering `THEME UI`, and for the all-hidden case rendering `a`'s heading instead of the placeholder). The second ("lands on the first section when it is visible") PASSES already (characterization the change must preserve).

- [ ] **Step 3: Add `FirstVisibleRedirect` and rewire the index branch**

In `packages/frame/src/pages/Settings.tsx`, add this component immediately above `export default function Settings()` (after `SectionContent`):

```tsx
/**
 * Redirect `/settings` to the first *visible* top-level section. A recursive delegation
 * chain: each link is its own fiber, so `node.useVisible()` is a stable single hook call
 * (never a hook-in-a-loop), and the chain resolves synchronously in one render pass — no
 * empty flash. Falls through to the "no settings" placeholder when all are hidden.
 */
function FirstVisibleRedirect({ nodes }: { nodes: SettingsNode[] }) {
  const [node, ...rest] = nodes;
  if (!node) return <div className="p-8 text-muted-foreground">No settings available.</div>;
  const visible = node.useVisible ? node.useVisible() : true;
  if (visible) return <Navigate to={`/settings/${node.id}`} replace />;
  return <FirstVisibleRedirect nodes={rest} />;
}
```

Then replace the current index branch inside `Settings()`:

```tsx
  if (!sectionId) {
    const first = settings.nodes[0];
    return first ? (
      <Navigate to={`/settings/${first.id}`} replace />
    ) : (
      <div className="p-8 text-muted-foreground">No settings available.</div>
    );
  }
```

with:

```tsx
  if (!sectionId) return <FirstVisibleRedirect nodes={settings.nodes} />;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/frame/src/pages/Settings.test.tsx`
Expected: PASS (all tests in the file — the three new ones plus the four existing).

- [ ] **Step 5: Correct the now-stale SDK doc comment**

In `packages/plugin-sdk/src/types.ts`, in the `SettingsSection.useVisible` doc comment, the redirect caveat is now false. Replace:

```
   * link. Note: the `/settings` default redirect targets the first node structurally
   * and is not visibility-filtered, so it may land on a hidden first section. A given
```

with:

```
   * link. The `/settings` default redirect skips hidden sections, landing on the
   * first visible one. A given
```

(If the surrounding wrapping differs slightly, match the actual file: replace only the two sentences about the default redirect not being visibility-filtered, keeping the `useVisible` rules-of-hooks sentence that follows.)

- [ ] **Step 6: Full suite + typecheck**

Run: `bun test`
Expected: PASS (whole repo).
Run: `bun run typecheck`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add packages/frame/src/pages/Settings.tsx packages/frame/src/pages/Settings.test.tsx packages/plugin-sdk/src/types.ts
git commit -m "feat: /settings redirect skips hidden sections"
```

---

## Self-review

- **Spec coverage:** stable id export + `settingsPlugin` uses it (Task 1); merge-hide of the frame-owned section proven at the data level (Task 1, second test); `FirstVisibleRedirect` hook-safe/flash-free redirect skipping hidden sections, incl. all-hidden placeholder (Task 2); doc-comment correction (Task 2, Step 5). Usage is documentation-only (spec §2) — no code owed. Covered.
- **Placeholder scan:** none — all steps carry real code and exact `bun test <path>` commands.
- **Type consistency:** `FRAME_APPEARANCE_SETTINGS_ID` (string) defined in `settingsPlugin.tsx`, re-exported from `index.ts`, imported in both test files identically. `FirstVisibleRedirect({ nodes }: { nodes: SettingsNode[] })` uses `SettingsNode` (already imported in `Settings.tsx`) and `Navigate` (already imported). `renderIndex(settings: ComposedSettings)` reuses the `compose`/`ComposedSettings`/`FrameProvider` helpers already defined at the top of `Settings.test.tsx`.
```
