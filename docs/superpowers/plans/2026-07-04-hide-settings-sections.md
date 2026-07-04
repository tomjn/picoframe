# Hide Settings Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a plugin hide a settings section (and its subtree) from the settings navigation at runtime via a reactive `useVisible` hook, independent of whether the feature's screen/nav item is hidden.

**Architecture:** Add one optional field `useVisible?: () => boolean` to `SettingsSection`, mirroring `NavItem.useVisible` (same rules-of-hooks contract, same **soft** semantics — hidden from the settings tree/cards but still reachable by direct `/settings/<id>` link). Consume it in `pages/Settings.tsx` at two render sites, each guarded in its own fiber: `NavNode` (left tree) and a newly-extracted `SectionCard` (category-card grid). `composeSettings` gains one line so the field merges consistently with the other optional fields.

**Tech Stack:** TypeScript, React 19, react-router 7, Bun test runner (`bun:test`) + `@testing-library/react` with happy-dom (preloaded via root `bunfig.toml`).

---

## Spec

Design doc: `docs/superpowers/specs/2026-07-04-hide-settings-sections-design.md`.

## Deviation from spec (flagged)

The spec says `composeSettings` is unchanged. During planning we found `composeSettings.ts:31-36` merges same-`id` sections by cherry-picking fields with `??=` (`order`, `description`, `icon`, `parent`, `Component`) but omits `useVisible`. The first-declarer path (`{ ...s }`, line 38) already carries `useVisible`, but a `useVisible` supplied only by a *later* same-`id` declaration would be silently dropped. For consistency with every other optional field, Task 1 adds one line: `existing.useVisible ??= s.useVisible;`. This is the sole `composeSettings` change.

## File map

- `packages/plugin-sdk/src/types.ts` — **modify**: add `useVisible?: () => boolean` to `SettingsSection` (after `Component?`, line 112).
- `packages/frame/src/settings/composeSettings.ts` — **modify**: one line in the same-id merge block (lines 31-36). `SettingsNode extends SettingsSection`, so it inherits the field automatically.
- `packages/frame/src/settings/composeSettings.test.ts` — **modify**: add two merge tests.
- `packages/frame/src/pages/Settings.tsx` — **modify**: guard `NavNode`; extract `SectionCard` from `SectionContent`'s inline `.map` and guard it.
- `packages/frame/src/pages/Settings.test.tsx` — **create**: tree hiding, card-grid hiding, soft direct-render, live reactivity.

## Conventions (read before starting)

- Tests use `bun:test` (`import { afterEach, expect, test } from "bun:test"`) + `@testing-library/react`. Run from the **repo root** so `bunfig.toml`'s `happydom.ts` preload gives a DOM: `bun test packages/frame/src/pages/Settings.test.tsx`. Running from inside `packages/frame` fails with `document is not defined`.
- Reactivity uses `PersistentStoreProvider` + `useSetting` from `../settings/SettingsStoreProvider`, with `memoryStorage()` from `../settings/storage`. See `src/layout/Sidebar.test.tsx` (the "flips an item live" test) for the exact pattern.
- Hiding here removes the node from the DOM (`return null`), unlike the sidebar's `:has()` CSS group-collapse — so `queryByText(...)` absence assertions work directly (happy-dom does not evaluate `:has()`, but we don't rely on it).

---

## Task 1: `useVisible` field + consistent merge

**Files:**
- Modify: `packages/plugin-sdk/src/types.ts:112` (add field to `SettingsSection`)
- Modify: `packages/frame/src/settings/composeSettings.ts:31-36` (merge block)
- Test: `packages/frame/src/settings/composeSettings.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `packages/frame/src/settings/composeSettings.test.ts`:

```ts
test("useVisible from the first declarer is kept on the merged node", () => {
  const gate = () => false;
  const { byId } = composeSettings([
    plugin("a", [{ id: "x", title: "First", useVisible: gate }]),
    plugin("b", [{ id: "x", title: "Second" }]),
  ]);
  expect(byId.get("x")?.useVisible).toBe(gate);
});

test("a later same-id declaration fills useVisible when the first omitted it", () => {
  const gate = () => false;
  const { byId } = composeSettings([
    plugin("a", [{ id: "x", title: "First" }]),
    plugin("b", [{ id: "x", title: "Second", useVisible: gate }]),
  ]);
  expect(byId.get("x")?.useVisible).toBe(gate);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `bun test packages/frame/src/settings/composeSettings.test.ts`
Expected: The first new test needs the SDK field to typecheck; both may fail to compile until Step 3's type change, and "a later same-id declaration fills useVisible" FAILs on value (`undefined` !== `gate`). If Bun reports a type/compile error on `useVisible`, that still counts as red — proceed to Step 3.

- [ ] **Step 3: Add the SDK field and the merge line**

In `packages/plugin-sdk/src/types.ts`, inside `interface SettingsSection`, immediately after the `Component?: ComponentType;` line (line 112):

```ts
  /**
   * Live visibility gate. A hook, evaluated in the section's own render within the
   * settings tree, so it may call `useSetting` / `useContext` / any hook. Return
   * `false` to hide the section (and its rendered subtree) from the settings
   * navigation; default is visible. Purely presentational and independent of the
   * feature's nav item — the section stays reachable at `/settings/<id>` by direct
   * link. Note: the `/settings` default redirect targets the first node structurally
   * and is not visibility-filtered, so it may land on a hidden first section. A given
   * section `id` must consistently define, or never define, `useVisible` (React's
   * rules of hooks).
   */
  useVisible?: () => boolean;
```

In `packages/frame/src/settings/composeSettings.ts`, add one line to the merge block so it reads:

```ts
      if (existing) {
        existing.order ??= s.order;
        existing.description ??= s.description;
        existing.icon ??= s.icon;
        existing.parent ??= s.parent;
        existing.Component ??= s.Component;
        existing.useVisible ??= s.useVisible;
      } else {
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/frame/src/settings/composeSettings.test.ts`
Expected: PASS (all tests in the file, including the two new ones).

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: PASS (no errors).

- [ ] **Step 6: Commit**

```bash
git add packages/plugin-sdk/src/types.ts packages/frame/src/settings/composeSettings.ts packages/frame/src/settings/composeSettings.test.ts
git commit -m "feat: SettingsSection.useVisible field + consistent merge"
```

---

## Task 2: Hide sections in the settings tree (`NavNode`)

**Files:**
- Modify: `packages/frame/src/pages/Settings.tsx:7-40` (`NavNode`)
- Test: `packages/frame/src/pages/Settings.test.tsx` (create)

- [ ] **Step 1: Write the failing tests**

Create `packages/frame/src/pages/Settings.test.tsx`:

```tsx
import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import type { FramePlugin, SettingsSection } from "@picoframe/plugin-sdk";
import { FrameProvider, type FrameContextValue } from "../context/frame";
import { PersistentStoreProvider, useSetting } from "../settings/SettingsStoreProvider";
import { memoryStorage } from "../settings/storage";
import { type ComposedSettings, composeSettings } from "../settings/composeSettings";
import Settings from "./Settings";

afterEach(cleanup);

function compose(sections: SettingsSection[]): ComposedSettings {
  const plugin: FramePlugin = { id: "p", version: "0", routes: [], settings: sections };
  return composeSettings([plugin]);
}

function renderAt(settings: ComposedSettings, sectionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/settings/${sectionId}`]}>
      <FrameProvider value={{ settings } as unknown as FrameContextValue}>
        <Routes>
          <Route path="/settings/:sectionId" element={<Settings />} />
        </Routes>
      </FrameProvider>
    </MemoryRouter>,
  );
}

test("hides a top-level section whose useVisible returns false from the tree", () => {
  const settings = compose([
    { id: "home", title: "Home", Component: () => <div>HOME PANEL</div> },
    { id: "vis", title: "Visible Section" },
    { id: "hid", title: "Hidden Section", useVisible: () => false },
  ]);
  renderAt(settings, "home");
  expect(screen.getByText("Visible Section")).toBeTruthy();
  expect(screen.queryByText("Hidden Section")).toBeNull();
});

test("flips a section's tree presence live when its backing useSetting changes", () => {
  const settings = compose([
    { id: "home", title: "Home", Component: () => <div>HOME</div> },
    { id: "dev", title: "Dev Section", useVisible: () => useSetting("devMode", false)[0] },
  ]);
  function Toggle() {
    const [on, setOn] = useSetting("devMode", false);
    return (
      <button type="button" onClick={() => setOn(!on)}>
        toggle
      </button>
    );
  }
  render(
    <PersistentStoreProvider storage={memoryStorage()}>
      <MemoryRouter initialEntries={["/settings/home"]}>
        <FrameProvider value={{ settings } as unknown as FrameContextValue}>
          <Toggle />
          <Routes>
            <Route path="/settings/:sectionId" element={<Settings />} />
          </Routes>
        </FrameProvider>
      </MemoryRouter>
    </PersistentStoreProvider>,
  );
  expect(screen.queryByText("Dev Section")).toBeNull();
  fireEvent.click(screen.getByText("toggle"));
  expect(screen.getByText("Dev Section")).toBeTruthy();
  fireEvent.click(screen.getByText("toggle"));
  expect(screen.queryByText("Dev Section")).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/frame/src/pages/Settings.test.tsx`
Expected: FAIL. `NavNode` ignores `useVisible` today, so "Hidden Section" / "Dev Section" render — `queryByText(...)` returns a node instead of `null`.

- [ ] **Step 3: Guard `NavNode`**

In `packages/frame/src/pages/Settings.tsx`, add the guard as the first lines inside `NavNode`, before `const Icon = node.icon;`:

```tsx
function NavNode({ node, activeId, nested = false }: { node: SettingsNode; activeId: string; nested?: boolean }) {
  // A section can hide itself (and its rendered subtree) from the settings tree via a
  // reactive `useVisible` hook — evaluated here, in the node's own fiber, so it stays
  // hook-safe as sections mount/unmount. Soft: still reachable by direct link (see
  // SectionContent). A given id must consistently define, or not define, `useVisible`.
  const visible = node.useVisible ? node.useVisible() : true;
  if (!visible) return null;
  const Icon = node.icon;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/frame/src/pages/Settings.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add packages/frame/src/pages/Settings.tsx packages/frame/src/pages/Settings.test.tsx
git commit -m "feat: hide useVisible=false settings sections from the tree"
```

---

## Task 3: Hide sections in the category-card grid (`SectionCard`)

**Files:**
- Modify: `packages/frame/src/pages/Settings.tsx:42-82` (`SectionContent`; extract `SectionCard`)
- Test: `packages/frame/src/pages/Settings.test.tsx` (append)

- [ ] **Step 1: Write the failing tests**

Append to `packages/frame/src/pages/Settings.test.tsx`:

```tsx
test("hides a hidden child from its parent category's card grid", () => {
  const settings = compose([
    { id: "cat", title: "Category" },
    { id: "cat.vis", title: "Visible Child", parent: "cat" },
    { id: "cat.hid", title: "Hidden Child", parent: "cat", useVisible: () => false },
  ]);
  renderAt(settings, "cat");
  // Visible child appears in both the tree and the card grid; hidden child in neither.
  expect(screen.getAllByText("Visible Child").length).toBe(2);
  expect(screen.queryByText("Hidden Child")).toBeNull();
});

test("still renders a hidden section when navigated to directly (soft hide)", () => {
  const settings = compose([
    { id: "home", title: "Home" },
    { id: "secret", title: "Secret", useVisible: () => false, Component: () => <div>SECRET BODY</div> },
  ]);
  renderAt(settings, "secret");
  expect(screen.getByText("SECRET BODY")).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify the card-grid test fails**

Run: `bun test packages/frame/src/pages/Settings.test.tsx`
Expected: The "card grid" test FAILs — `SectionContent` maps children inline and ignores `useVisible`, so "Hidden Child" renders as a card (`queryByText` non-null) and "Visible Child" count is 3 (tree + its own card + hidden card's... actually tree + 2 cards). Either way it is red. The "soft hide" test PASSes already (it characterises existing behaviour the refactor must preserve).

- [ ] **Step 3: Extract `SectionCard` and guard it**

In `packages/frame/src/pages/Settings.tsx`, add this component just above `SectionContent` (it uses `ChevronRight`, already imported):

```tsx
function SectionCard({ node }: { node: SettingsNode }) {
  // Per-child fiber so `useVisible` is a stable, hook-safe call (a hook in the parent's
  // `.map` would violate rules of hooks). Mirrors the tree guard in `NavNode`.
  const visible = node.useVisible ? node.useVisible() : true;
  if (!visible) return null;
  const Icon = node.icon;
  return (
    <li>
      <NavLink
        to={`/settings/${node.id}`}
        className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground transition-colors hover:border-ring hover:bg-accent"
      >
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-background">
            <Icon size={16} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{node.title}</span>
          {node.description && (
            <span className="block truncate text-xs text-muted-foreground">{node.description}</span>
          )}
        </span>
        <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
      </NavLink>
    </li>
  );
}
```

Then replace the inline `.map` in `SectionContent` (the `node.children.length ? (<ul>...</ul>) : null` branch) so the `<ul>` body reads:

```tsx
          <ul className="grid gap-2">
            {node.children.map((child) => (
              <SectionCard key={child.id} node={child} />
            ))}
          </ul>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/frame/src/pages/Settings.test.tsx`
Expected: PASS (all four tests in the file).

- [ ] **Step 5: Full test suite + typecheck**

Run: `bun test`
Expected: PASS (whole repo).
Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/frame/src/pages/Settings.tsx packages/frame/src/pages/Settings.test.tsx
git commit -m "feat: hide useVisible=false settings sections from category cards"
```

---

## Self-review

- **Spec coverage:** API field (Task 1), tree hiding + reactivity (Task 2), card-grid hiding + soft direct-render (Task 3), default-redirect limitation (documented in the type doc, Task 1 Step 3). The one merge-consistency addition is flagged above. Covered.
- **Type consistency:** `useVisible?: () => boolean` used identically in the SDK type, `composeSettings` merge, `NavNode`, and `SectionCard`. `SettingsNode` inherits it via `extends SettingsSection`. `compose`/`renderAt` test helpers are defined once in Task 2 and reused in Task 3 (same file).
- **No placeholders:** all steps carry real code and exact `bun test <path>` commands.
