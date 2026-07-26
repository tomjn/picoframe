import { afterEach, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

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

// The viewport is shared global state across every test file, so put it back afterwards.
const DEFAULT_WIDTH = window.innerWidth;

function setWidth(width: number) {
  act(() => {
    window.happyDOM.setViewport({ width });
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  setWidth(DEFAULT_WIDTH);
});

const nav: NavGroup[] = [{ id: "main", items: [{ id: "a", label: "Alpha", to: "/a" }] }];
const emptyResolvers: CrumbResolvers = { static: new Map(), patterns: [], routes: [] };

function renderLayout(config?: LayoutConfig) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <ThemeProvider>
        <DrawerProvider>
          <LayoutConfigProvider config={config}>
            <FrameProvider
              value={{ title: "App", nav, crumbs: emptyResolvers, fallback: null } as unknown as FrameContextValue}
            >
              <AppLayout />
            </FrameProvider>
          </LayoutConfigProvider>
        </DrawerProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

test("default mode renders the persistent sidebar, no popover", () => {
  const { container } = renderLayout();
  expect(container.querySelector("[data-slot=sidebar]")).not.toBeNull();
  expect(container.querySelector("[data-slot=sidebar-popover]")).toBeNull();
});

test("popover mode drops the persistent sidebar and opens the popover from the menu button", () => {
  const { container } = renderLayout({ sidebar: { popover: true } });
  expect(container.querySelector("[data-slot=sidebar]")).toBeNull();
  // Closed until the menu button is pressed.
  expect(container.querySelector("[data-slot=sidebar-popover]")).toBeNull();
  fireEvent.click(screen.getByLabelText("Menu"));
  expect(container.querySelector("[data-slot=sidebar-popover]")).not.toBeNull();
  expect(screen.getByText("Alpha")).toBeTruthy();
});

test("hover-reveal mode mounts the floating panel once the sidebar is collapsed", () => {
  const { container } = renderLayout({ sidebar: { hoverReveal: true } });
  // Expanded: the docked sidebar is shown and there's nothing to reveal yet.
  expect(container.querySelector("[data-slot=sidebar-reveal-panel]")).toBeNull();
  fireEvent.click(screen.getByLabelText("Toggle sidebar"));
  expect(container.querySelector("[data-slot=sidebar-reveal-panel]")).not.toBeNull();
});

test("a narrow window swaps the docked sidebar for the fullscreen menu", () => {
  setWidth(500);
  const { container } = renderLayout({ sidebar: { collapseWhenNarrow: true } });
  expect(container.querySelector("[data-slot=sidebar]")).toBeNull();
  fireEvent.click(screen.getByLabelText("Menu"));
  const panel = container.querySelector("[data-slot=sidebar-popover]") as HTMLElement | null;
  expect(panel).not.toBeNull();
  expect(panel?.dataset.fullscreen).toBe("true");
});

test("a wide window keeps the docked sidebar with the option on", () => {
  setWidth(1024);
  const { container } = renderLayout({ sidebar: { collapseWhenNarrow: true } });
  expect(container.querySelector("[data-slot=sidebar]")).not.toBeNull();
});

test("an app can raise the breakpoint so the sidebar gives way sooner", () => {
  setWidth(800);
  const { container } = renderLayout({
    sidebar: { collapseWhenNarrow: true, narrowBreakpoint: 900 },
  });
  // 800px is wide by the 640 default, narrow by this app's own threshold.
  expect(container.querySelector("[data-slot=sidebar]")).toBeNull();
});

test("a narrow window keeps the docked sidebar with the option off", () => {
  setWidth(500);
  const { container } = renderLayout();
  expect(container.querySelector("[data-slot=sidebar]")).not.toBeNull();
});

test("widening the window closes the menu and restores the docked sidebar", () => {
  setWidth(500);
  const { container } = renderLayout({ sidebar: { collapseWhenNarrow: true } });
  fireEvent.click(screen.getByLabelText("Menu"));
  expect(container.querySelector("[data-slot=sidebar-popover]")).not.toBeNull();

  setWidth(1024);
  expect(container.querySelector("[data-slot=sidebar-popover]")).toBeNull();
  expect(container.querySelector("[data-slot=sidebar]")).not.toBeNull();
});

test("explicit popover mode stays an anchored card on a wide window", () => {
  setWidth(1024);
  const { container } = renderLayout({ sidebar: { popover: true, collapseWhenNarrow: true } });
  fireEvent.click(screen.getByLabelText("Menu"));
  const panel = container.querySelector("[data-slot=sidebar-popover]") as HTMLElement | null;
  expect(panel?.dataset.fullscreen).toBeUndefined();
});

test("popover wins over hover-reveal: no floating panel, no docked sidebar", () => {
  const { container } = renderLayout({ sidebar: { popover: true, hoverReveal: true } });
  expect(container.querySelector("[data-slot=sidebar]")).toBeNull();
  expect(container.querySelector("[data-slot=sidebar-reveal-panel]")).toBeNull();
});
