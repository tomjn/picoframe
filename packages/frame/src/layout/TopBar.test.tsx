import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { IconComponent, NavGroup } from "@picoframe/plugin-sdk";
import { FrameProvider, type FrameContextValue } from "../context/frame";
import type { CrumbResolvers } from "../routing/crumbs";
import { TopBar } from "./TopBar";

afterEach(cleanup);

const emptyResolvers: CrumbResolvers = { static: new Map(), patterns: [], routes: [] };
const nav: NavGroup[] = [{ id: "main", items: [{ id: "a", label: "Alpha", to: "/a" }] }];

function renderTopBar(path: string, breadcrumbCollapsed = false, showHistoryButtons = true) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FrameProvider value={{ title: "App", nav, crumbs: emptyResolvers } as unknown as FrameContextValue}>
        <TopBar
          title="App"
          onToggleSidebar={() => {}}
          breadcrumbCollapsed={breadcrumbCollapsed}
          showHistoryButtons={showHistoryButtons}
        />
      </FrameProvider>
    </MemoryRouter>,
  );
}

function renderTopBarPopover(
  menuOpen: boolean,
  menu?: { menuIcon?: IconComponent; menuLabel?: string },
) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <FrameProvider value={{ title: "App", nav, crumbs: emptyResolvers } as unknown as FrameContextValue}>
        <TopBar
          title="App"
          onToggleSidebar={() => {}}
          popover
          menuOpen={menuOpen}
          onCloseMenu={() => {}}
          menuIcon={menu?.menuIcon}
          menuLabel={menu?.menuLabel}
        />
      </FrameProvider>
    </MemoryRouter>,
  );
}

test("full breadcrumb shows every crumb with no hover wrapper", () => {
  const { container } = renderTopBar("/reports/archive", false);
  expect(screen.getByText("Reports")).toBeTruthy();
  expect(screen.getByText("Archive")).toBeTruthy();
  expect(container.querySelector("[data-crumb-ancestors]")).toBeNull();
});

test("collapsed breadcrumb keeps ancestors in the DOM, wrapped for hover reveal", () => {
  renderTopBar("/reports/archive", true);
  // Current page always visible.
  expect(screen.getByText("Archive")).toBeTruthy();
  // Ancestor stays in the DOM (keyboard/screen-reader can reach it), not removed.
  const ancestor = screen.getByText("Reports").closest("[data-crumb-ancestors]");
  expect(ancestor).not.toBeNull();
  expect(ancestor?.className).toContain("group-hover:grid-cols-[1fr]");
  expect(ancestor?.className).toContain("group-focus-within:grid-cols-[1fr]");
});

test("collapsed breadcrumb with a single crumb just shows it (no wrapper)", () => {
  const { container } = renderTopBar("/reports", true);
  expect(screen.getByText("Reports")).toBeTruthy();
  expect(container.querySelector("[data-crumb-ancestors]")).toBeNull();
});

test("popover menu anchors inside the menu button's positioned wrapper", () => {
  const { container } = renderTopBarPopover(true);
  const anchor = screen.getByLabelText("Menu").closest(".relative");
  expect(anchor).not.toBeNull();
  const panel = container.querySelector("[data-slot=sidebar-popover]");
  expect(panel).not.toBeNull();
  // The panel must share the trigger's positioned ancestor so CSS can anchor it beneath.
  expect(anchor?.contains(panel as Node)).toBe(true);
});

test("popover mode relabels the button to a menu default, not the sidebar toggle", () => {
  renderTopBarPopover(false);
  expect(screen.getByLabelText("Menu")).toBeTruthy();
  expect(screen.queryByLabelText("Toggle sidebar")).toBeNull();
});

test("custom menu icon and label override the popover defaults", () => {
  const CustomIcon: IconComponent = (props) => <svg data-testid="custom-icon" {...props} />;
  renderTopBarPopover(false, { menuIcon: CustomIcon, menuLabel: "Friends" });
  expect(screen.getByLabelText("Friends")).toBeTruthy();
  expect(screen.getByTestId("custom-icon")).toBeTruthy();
  expect(screen.queryByLabelText("Menu")).toBeNull();
});

test("no popover panel is rendered outside popover mode", () => {
  const { container } = renderTopBar("/", false);
  expect(container.querySelector("[data-slot=sidebar-popover]")).toBeNull();
});

test("shows back/forward buttons by default", () => {
  renderTopBar("/a/b");
  expect(screen.getByLabelText("Back")).toBeTruthy();
  expect(screen.getByLabelText("Forward")).toBeTruthy();
});

test("hides back/forward buttons when history buttons are disabled", () => {
  renderTopBar("/a/b", false, false);
  expect(screen.queryByLabelText("Back")).toBeNull();
  expect(screen.queryByLabelText("Forward")).toBeNull();
});
