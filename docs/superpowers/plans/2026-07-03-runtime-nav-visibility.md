# Runtime Nav-Item Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a picoframe app show/hide sidebar nav items at runtime via a reactive per-item predicate, with an optional route guard for items that must also be unreachable while hidden.

**Architecture:** Add one optional hook field `useVisible?: () => boolean` to `NavItem`. `NavGroupView` (in `Sidebar.tsx`) is the single point that evaluates each item's `useVisible`, filters the group to visible items, and collapses the whole group (header included) when none remain. Because `useVisible` is a real hook, flipping its backing reactive source (`useSetting` / `useContext`) re-renders the group. A separate ~8-line `<NavGate>` component reuses the same predicate to redirect away from a gated route.

**Tech Stack:** React 19, react-router v7, Bun test runner. This plan introduces the repo's first DOM test harness: `@happy-dom/global-registrator` + `@testing-library/react` (+ `@testing-library/dom` peer), wired via a root `bunfig.toml` preload.

---

## File structure

- `bunfig.toml` (root, **create**) — registers the happy-dom preload for `bun test`.
- `happydom.ts` (root, **create**) — one-line happy-dom global registration.
- `package.json` (root, **modify**) — add three devDependencies.
- `packages/frame/src/dom-smoke.test.tsx` (**create**) — proves the DOM harness works; can be deleted later but harmless to keep.
- `packages/plugin-sdk/src/types.ts` (**modify**) — add `useVisible?: () => boolean` to `NavItem`.
- `packages/frame/src/layout/Sidebar.tsx` (**modify**) — `NavGroupView` evaluates `useVisible`, filters, and collapses empty groups.
- `packages/frame/src/layout/Sidebar.test.tsx` (**create**) — visibility, group auto-hide, reactivity tests.
- `packages/frame/src/nav/NavGate.tsx` (**create**) — the route guard.
- `packages/frame/src/nav/NavGate.test.tsx` (**create**) — renders children vs redirects.
- `packages/frame/src/index.ts` (**modify**) — export `NavGate`.

Notes for the implementer:
- There is **no** `biome.json` and **no** `lint`/`test` DOM config in the repo. Biome runs with defaults; follow the existing `// biome-ignore lint/...` comment convention (see `SettingsStoreProvider.tsx:53`) for the one intentional hook-in-a-loop call.
- All tests run via `bun test` **from the repo root** (`package.json` script `"test": "bun test"`). Run individual files with `bun test <path>`.
- Do **not** add `@testing-library/jest-dom`. Assert with Bun's built-in matchers (`.toBeTruthy()`, `.toBeNull()`) against `screen.queryByText(...)`.

---

## Task 1: DOM test harness (happy-dom + React Testing Library)

**Files:**
- Modify: `package.json` (root devDependencies)
- Create: `happydom.ts` (root)
- Create: `bunfig.toml` (root)
- Create: `packages/frame/src/dom-smoke.test.tsx`

- [ ] **Step 1: Install the DOM test dev-dependencies**

Run from the repo root:

```bash
bun add -d @happy-dom/global-registrator @testing-library/react @testing-library/dom
```

Expected: `package.json` root `devDependencies` gains the three packages; `bun install` completes.

- [ ] **Step 2: Create the happy-dom registration preload**

Create `happydom.ts` at the repo root:

```ts
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Registers window/document/etc. globally so React Testing Library can render.
GlobalRegistrator.register();
```

- [ ] **Step 3: Create the Bun test config that preloads it**

Create `bunfig.toml` at the repo root:

```toml
[test]
preload = ["./happydom.ts"]
```

- [ ] **Step 4: Write a smoke test that renders a component**

Create `packages/frame/src/dom-smoke.test.tsx`:

```tsx
import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

afterEach(cleanup);

test("happy-dom harness can render a React component", () => {
  render(<div>harness-ok</div>);
  expect(screen.getByText("harness-ok")).toBeTruthy();
});
```

- [ ] **Step 5: Run the smoke test**

Run: `bun test packages/frame/src/dom-smoke.test.tsx`
Expected: PASS (1 pass). If it errors with `document is not defined`, the preload isn't being picked up — confirm `bunfig.toml` is at the repo root and you're running from the root.

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `bun test`
Expected: all existing tests still pass (the global DOM is inert for pure-logic tests).

- [ ] **Step 7: Commit**

```bash
git add package.json bun.lock happydom.ts bunfig.toml packages/frame/src/dom-smoke.test.tsx
git commit -m "test: add happy-dom + RTL DOM test harness"
```

(If the lockfile is named `bun.lockb`, add that instead of `bun.lock`.)

---

## Task 2: Add the `useVisible` field to `NavItem`

**Files:**
- Modify: `packages/plugin-sdk/src/types.ts` (the `NavItem` interface, after `badge`)

- [ ] **Step 1: Add the field to the `NavItem` interface**

In `packages/plugin-sdk/src/types.ts`, inside `interface NavItem`, immediately after the `badge?: () => ReactNode;` line, add:

```ts
  /**
   * Live visibility gate. A hook, evaluated in the item's own render (in the sidebar),
   * so it may call `useSetting` / `useContext` / any hook. Return `false` to hide the
   * item from the sidebar; default is always visible. Purely presentational — to also
   * make the route unreachable while hidden, wrap the page in `<NavGate>` using the same
   * predicate. Distinct from `sidebar: false`, which is a static "never a sidebar entry".
   */
  useVisible?: () => boolean;
```

- [ ] **Step 2: Type-check the workspace**

Run: `bun run typecheck`
Expected: PASS (no type errors — this is a purely additive optional field).

- [ ] **Step 3: Commit**

```bash
git add packages/plugin-sdk/src/types.ts
git commit -m "feat(plugin-sdk): add NavItem.useVisible runtime visibility hook"
```

---

## Task 3: Sidebar respects `useVisible` (hide items, collapse empty groups, reactively)

**Files:**
- Modify: `packages/frame/src/layout/Sidebar.tsx` (`NavGroupView`)
- Create: `packages/frame/src/layout/Sidebar.test.tsx`

Context for the implementer: `Sidebar` takes `{ groups, collapsed, width, onResize }`. It already filters out items with `sidebar: false` and drops statically-empty groups *before* rendering `NavGroupView` (`Sidebar.tsx:156-161`). `NavGroupView` renders a header (when `group.label` and not collapsed) followed by one `NavItemView` per item. `NavItemView` renders a `react-router` `NavLink` for `to` items, so tests must wrap `Sidebar` in a router.

- [ ] **Step 1: Write the failing visibility + group-collapse tests**

Create `packages/frame/src/layout/Sidebar.test.tsx`:

```tsx
import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { NavGroup } from "@picoframe/plugin-sdk";
import { Sidebar } from "./Sidebar";

afterEach(cleanup);

function renderSidebar(groups: NavGroup[]) {
  return render(
    <MemoryRouter>
      <Sidebar groups={groups} collapsed={false} width={200} onResize={() => {}} />
    </MemoryRouter>,
  );
}

test("hides an item whose useVisible returns false, keeps visible siblings", () => {
  renderSidebar([
    {
      id: "main",
      items: [
        { id: "a", label: "Always", to: "/a" },
        { id: "b", label: "Hidden", to: "/b", useVisible: () => false },
      ],
    },
  ]);
  expect(screen.getByText("Always")).toBeTruthy();
  expect(screen.queryByText("Hidden")).toBeNull();
});

test("collapses the whole group (header included) when every item is hidden", () => {
  renderSidebar([
    {
      id: "dev",
      label: "Dev Tools",
      items: [
        { id: "x", label: "Inspector", to: "/x", useVisible: () => false },
        { id: "y", label: "Logs", to: "/y", useVisible: () => false },
      ],
    },
  ]);
  expect(screen.queryByText("Dev Tools")).toBeNull();
  expect(screen.queryByText("Inspector")).toBeNull();
  expect(screen.queryByText("Logs")).toBeNull();
});

test("keeps the group header when at least one item is visible", () => {
  renderSidebar([
    {
      id: "dev",
      label: "Dev Tools",
      items: [
        { id: "x", label: "Inspector", to: "/x", useVisible: () => true },
        { id: "y", label: "Logs", to: "/y", useVisible: () => false },
      ],
    },
  ]);
  expect(screen.getByText("Dev Tools")).toBeTruthy();
  expect(screen.getByText("Inspector")).toBeTruthy();
  expect(screen.queryByText("Logs")).toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test packages/frame/src/layout/Sidebar.test.tsx`
Expected: FAIL — "Hidden", "Dev Tools", "Inspector", "Logs" all still render because `NavGroupView` ignores `useVisible`.

- [ ] **Step 3: Update `NavGroupView` to evaluate `useVisible`, filter, and collapse**

In `packages/frame/src/layout/Sidebar.tsx`, replace the entire `NavGroupView` function with:

```tsx
function NavGroupView({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  // Single evaluation point for live visibility. `useVisible` is a hook, so it is called
  // here in a stable loop over the statically-composed `items` array (nav is composed
  // once in AppFrame, so length and order are constant across renders — safe hook order).
  const visibleItems = group.items.filter((item) =>
    // biome-ignore lint/correctness/useHookAtTopLevel: items array is static (composed once in AppFrame), so hook order is stable
    item.useVisible ? item.useVisible() : true,
  );
  if (visibleItems.length === 0) return null;

  return (
    <div className="space-y-1">
      {group.label && !collapsed && (
        <div className="px-2 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {group.label}
        </div>
      )}
      {visibleItems.map((item) => (
        <NavItemView key={item.id} item={item} collapsed={collapsed} />
      ))}
    </div>
  );
}
```

Leave `NavItemView`, `Sidebar`, and the existing `sidebar !== false` / empty-group filters (`Sidebar.tsx:156-161`) unchanged — the static filter still runs first; this only adds the dynamic layer.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test packages/frame/src/layout/Sidebar.test.tsx`
Expected: PASS (3 pass).

- [ ] **Step 5: Write the failing reactivity test**

First add these three imports to the **existing import block at the top** of `packages/frame/src/layout/Sidebar.test.tsx` (merge `fireEvent` into the existing `@testing-library/react` import):

```tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PersistentStoreProvider, useSetting } from "../settings/SettingsStoreProvider";
import { memoryStorage } from "../settings/storage";
```

Then append this test to the bottom of the file:

```tsx
test("flips an item live when its backing useSetting flag changes", () => {
  const groups: NavGroup[] = [
    {
      id: "dev",
      label: "Dev Tools",
      items: [
        {
          id: "inspector",
          label: "Inspector",
          to: "/inspector",
          useVisible: () => useSetting("devMode", false)[0],
        },
      ],
    },
  ];

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
      <MemoryRouter>
        <Toggle />
        <Sidebar groups={groups} collapsed={false} width={200} onResize={() => {}} />
      </MemoryRouter>
    </PersistentStoreProvider>,
  );

  // Hidden initially (devMode defaults to false).
  expect(screen.queryByText("Inspector")).toBeNull();

  // Turn dev mode on: the sidebar's useSetting subscription re-renders NavGroupView.
  fireEvent.click(screen.getByText("toggle"));
  expect(screen.getByText("Inspector")).toBeTruthy();

  // Turn it back off: the item disappears again.
  fireEvent.click(screen.getByText("toggle"));
  expect(screen.queryByText("Inspector")).toBeNull();
});
```

- [ ] **Step 6: Run the reactivity test**

Run: `bun test packages/frame/src/layout/Sidebar.test.tsx`
Expected: PASS (4 pass). The behavior already works from the Step 3 change — this test proves the hook subscription re-renders the sidebar live; no further source change is needed. If it fails at the first `fireEvent`, confirm `memoryStorage` is imported from `../settings/storage` and `PersistentStoreProvider` from `../settings/SettingsStoreProvider`.

- [ ] **Step 7: Type-check**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/frame/src/layout/Sidebar.tsx packages/frame/src/layout/Sidebar.test.tsx
git commit -m "feat(frame): honor NavItem.useVisible in the sidebar, collapse empty groups"
```

---

## Task 4: `<NavGate>` route guard + export

**Files:**
- Create: `packages/frame/src/nav/NavGate.tsx`
- Create: `packages/frame/src/nav/NavGate.test.tsx`
- Modify: `packages/frame/src/index.ts`

- [ ] **Step 1: Write the failing NavGate tests**

Create `packages/frame/src/nav/NavGate.test.tsx`:

```tsx
import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { NavGate } from "./NavGate";

afterEach(cleanup);

function renderAt(path: string, use: () => boolean, redirectTo?: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>home-page</div>} />
        <Route
          path="/secret"
          element={
            <NavGate use={use} redirectTo={redirectTo}>
              <div>secret-page</div>
            </NavGate>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

test("renders children when the predicate is true", () => {
  renderAt("/secret", () => true);
  expect(screen.getByText("secret-page")).toBeTruthy();
});

test("redirects to / by default when the predicate is false", () => {
  renderAt("/secret", () => false);
  expect(screen.queryByText("secret-page")).toBeNull();
  expect(screen.getByText("home-page")).toBeTruthy();
});

test("redirects to a custom path when provided", () => {
  render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route path="/landing" element={<div>landing-page</div>} />
        <Route
          path="/secret"
          element={
            <NavGate use={() => false} redirectTo="/landing">
              <div>secret-page</div>
            </NavGate>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText("landing-page")).toBeTruthy();
  expect(screen.queryByText("secret-page")).toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test packages/frame/src/nav/NavGate.test.tsx`
Expected: FAIL — module `./NavGate` does not exist / `NavGate` is not defined.

- [ ] **Step 3: Implement NavGate**

Create `packages/frame/src/nav/NavGate.tsx`:

```tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router";

/**
 * Route guard mirroring a nav item's `useVisible` predicate. Wrap a page whose route
 * must be unreachable while gated: renders `children` when `use()` is true, otherwise
 * redirects (replacing history) to `redirectTo`. Cosmetic (sidebar-only) items don't
 * need this — use it only for the hard-gate subset, passing the same predicate you gave
 * the nav item's `useVisible`.
 */
export function NavGate({
  use,
  redirectTo = "/",
  children,
}: {
  use: () => boolean;
  redirectTo?: string;
  children: ReactNode;
}) {
  return use() ? <>{children}</> : <Navigate to={redirectTo} replace />;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test packages/frame/src/nav/NavGate.test.tsx`
Expected: PASS (3 pass).

- [ ] **Step 5: Export NavGate from the frame entry point**

In `packages/frame/src/index.ts`, add this line next to the other component/util exports (e.g. right after the `Slot` export on line 7):

```ts
export { NavGate } from "./nav/NavGate";
```

- [ ] **Step 6: Type-check the workspace**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/frame/src/nav/NavGate.tsx packages/frame/src/nav/NavGate.test.tsx packages/frame/src/index.ts
git commit -m "feat(frame): add NavGate route guard for hard-gated nav items"
```

---

## Task 5: Full verification

- [ ] **Step 1: Run the entire test suite**

Run: `bun test`
Expected: all tests pass — the new DOM tests plus every pre-existing test.

- [ ] **Step 2: Type-check the whole workspace**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 3: Build the libraries**

Run: `bun run build`
Expected: PASS — `@picoframe/frame` builds with the new `NavGate` export and the `useVisible` field present in `@picoframe/plugin-sdk`'s emitted types.

---

## Notes for a consuming app (not part of this plan's changes)

How an app author uses the feature once shipped:

```tsx
// Cosmetic: developer-mode item, hidden from the sidebar when the flag is off.
{
  id: "app.inspector",
  label: "Inspector",
  to: "/inspector",
  useVisible: () => useSetting("app.devMode", false)[0],
}

// Hard gate: same predicate on the nav item, and wrap the page so the route
// is unreachable when off.
export default function InspectorPage() {
  return (
    <NavGate use={() => useSetting("app.devMode", false)[0]} redirectTo="/">
      {/* page content */}
    </NavGate>
  );
}
```

The app owns the toggle UI and the `useSetting` key; picoframe only provides the reactive gate and the guard.
