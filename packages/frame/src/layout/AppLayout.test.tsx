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

test("the skip link is the first thing a Tab walk reaches, and it points at the content", () => {
  const { container } = renderLayout();
  const focusable = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  const skip = container.querySelector("[data-slot=skip-link]") as HTMLAnchorElement;
  expect(focusable[0]).toBe(skip);
  expect(skip.textContent).toBe("Skip to content");
  const main = container.querySelector("[data-slot=content-scroll]") as HTMLElement;
  expect(skip.getAttribute("href")).toBe(`#${main.id}`);
});

test("following the skip link moves focus to the content, not just the scroll position", () => {
  // WebKit scrolls to an in-page target without focusing it, which would drop the
  // reader back at the chrome on the next Tab.
  const { container } = renderLayout();
  const main = container.querySelector("[data-slot=content-scroll]") as HTMLElement;
  expect(main.tabIndex).toBe(-1);
  fireEvent.click(screen.getByText("Skip to content"));
  expect(document.activeElement).toBe(main);
});

test("a floating top bar insets the scroll area so content starts below it", () => {
  const { container } = renderLayout({ topBar: { floating: true } });
  const main = container.querySelector("[data-slot=content-scroll]") as HTMLElement;
  expect(main.className).toContain("pt-[var(--pf-topbar-inset)]");
  const column = main.parentElement as HTMLElement;
  expect(column.style.getPropertyValue("--pf-topbar-inset")).toBe("3rem");
  // The out-of-flow bar needs a positioned ancestor that isn't the whole window.
  expect(column.className).toContain("relative");
});

test("a docked top bar zeroes the inset, so a page's own override is inert", () => {
  const { container } = renderLayout();
  const main = container.querySelector("[data-slot=content-scroll]") as HTMLElement;
  const column = main.parentElement as HTMLElement;
  expect(column.style.getPropertyValue("--pf-topbar-inset")).toBe("0px");
});

test("popover wins over hover-reveal: no floating panel, no docked sidebar", () => {
  const { container } = renderLayout({ sidebar: { popover: true, hoverReveal: true } });
  expect(container.querySelector("[data-slot=sidebar]")).toBeNull();
  expect(container.querySelector("[data-slot=sidebar-reveal-panel]")).toBeNull();
});
