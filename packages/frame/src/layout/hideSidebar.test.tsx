import { afterEach, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Link, MemoryRouter, Route, Routes } from "react-router";

// The X1/X2 mouse-nav listener uses the Tauri event IPC, absent in happy-dom. Shim it so
// AppLayout mounts cleanly under test.
mock.module("@tauri-apps/api/event", () => ({ listen: () => Promise.resolve(() => {}) }));
import type { NavGroup } from "@picoframe/plugin-sdk";
import { FrameProvider, type FrameContextValue } from "../context/frame";
import { ThemeProvider } from "../context/theme";
import { LayoutConfigProvider, type LayoutConfig } from "../context/layoutConfig";
import { DrawerProvider } from "../drawer/DrawerProvider";
import type { CrumbResolvers } from "../routing/crumbs";
import { AppLayout } from "./AppLayout";
import { useHideSidebar } from "./hideSidebar";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const nav: NavGroup[] = [{ id: "main", items: [{ id: "a", label: "Alpha", to: "/a" }] }];
const emptyResolvers: CrumbResolvers = { static: new Map(), patterns: [], routes: [] };

/** Render the layout with real child routes, so pages mount under RouteHost's `Outlet`. */
function renderPages(
  pages: { path: string; element: React.ReactNode }[],
  { initialPath = "/", config }: { initialPath?: string; config?: LayoutConfig } = {},
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider>
        <DrawerProvider>
          <LayoutConfigProvider config={config}>
            <FrameProvider
              value={{ title: "App", nav, crumbs: emptyResolvers, fallback: null } as unknown as FrameContextValue}
            >
              <Routes>
                <Route element={<AppLayout />}>
                  {pages.map((p) => (
                    <Route key={p.path} path={p.path} element={p.element} />
                  ))}
                </Route>
              </Routes>
            </FrameProvider>
          </LayoutConfigProvider>
        </DrawerProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

function HidingPage({ hidden }: { hidden?: boolean }) {
  useHideSidebar(hidden);
  return (
    <div>
      <p>Focus page</p>
      <Link to="/plain">Leave</Link>
    </div>
  );
}

function PlainPage() {
  return <p>Plain page</p>;
}

test("a page calling useHideSidebar drops the rail but keeps the nav behind the menu button", () => {
  const { container } = renderPages([{ path: "/", element: <HidingPage /> }]);
  expect(container.querySelector("[data-slot=sidebar]")).toBeNull();

  fireEvent.click(screen.getByLabelText("Menu"));
  expect(container.querySelector("[data-slot=sidebar-popover]")).not.toBeNull();
  expect(screen.getByText("Alpha")).toBeTruthy();
});

test("useHideSidebar(false) leaves the rail in place", () => {
  const { container } = renderPages([{ path: "/", element: <HidingPage hidden={false} /> }]);
  expect(container.querySelector("[data-slot=sidebar]")).not.toBeNull();
});

test("the rail comes back on navigating to a page that does not hide it", () => {
  const { container } = renderPages([
    { path: "/", element: <HidingPage /> },
    { path: "/plain", element: <PlainPage /> },
  ]);
  expect(container.querySelector("[data-slot=sidebar]")).toBeNull();

  fireEvent.click(screen.getByText("Leave"));
  expect(screen.getByText("Plain page")).toBeTruthy();
  expect(container.querySelector("[data-slot=sidebar]")).not.toBeNull();
});

test("hiding the sidebar suppresses the hover-reveal panel", () => {
  const { container } = renderPages([{ path: "/", element: <HidingPage /> }], {
    config: { sidebar: { hoverReveal: true } },
  });
  expect(container.querySelector("[data-slot=sidebar]")).toBeNull();
  expect(container.querySelector("[data-slot=sidebar-reveal-panel]")).toBeNull();
});

/** Two hiding components on one page, unmounted one at a time. */
function TwoRequests() {
  const [mounted, setMounted] = useState(2);
  return (
    <>
      {Array.from({ length: mounted }, (_, i) => (
        <HidingPage key={i} />
      ))}
      <button type="button" onClick={() => setMounted((n) => n - 1)}>
        Drop one
      </button>
    </>
  );
}

test("the rail stays hidden while any request is outstanding", () => {
  const { container } = renderPages([{ path: "/", element: <TwoRequests /> }]);
  expect(container.querySelector("[data-slot=sidebar]")).toBeNull();

  fireEvent.click(screen.getByText("Drop one"));
  expect(container.querySelector("[data-slot=sidebar]")).toBeNull();

  fireEvent.click(screen.getByText("Drop one"));
  expect(container.querySelector("[data-slot=sidebar]")).not.toBeNull();
});
