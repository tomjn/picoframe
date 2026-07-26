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

function renderTopBar(
  path: string,
  breadcrumbCollapsed = false,
  showHistoryButtons = true,
  breadcrumbHidden = false,
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FrameProvider value={{ title: "App", nav, crumbs: emptyResolvers } as unknown as FrameContextValue}>
        <TopBar
          title="App"
          onToggleSidebar={() => {}}
          breadcrumbCollapsed={breadcrumbCollapsed}
          breadcrumbHidden={breadcrumbHidden}
          showHistoryButtons={showHistoryButtons}
        />
      </FrameProvider>
    </MemoryRouter>,
  );
}

interface MenuOpts {
  menuIcon?: IconComponent;
  menuIconOpen?: IconComponent;
  menuLabel?: string;
  menuLabelVisible?: boolean;
  menuLabelContent?: React.ReactNode;
}

function renderTopBarPopover(menuOpen: boolean, menu?: MenuOpts) {
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
          menuIconOpen={menu?.menuIconOpen}
          menuLabel={menu?.menuLabel}
          menuLabelVisible={menu?.menuLabelVisible}
          menuLabelContent={menu?.menuLabelContent}
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

test("hides the breadcrumb entirely when breadcrumbHidden is set", () => {
  const { container } = renderTopBar("/reports/archive", false, true, true);
  expect(screen.queryByText("Reports")).toBeNull();
  expect(screen.queryByText("Archive")).toBeNull();
  expect(container.querySelector("[data-slot=breadcrumbs]")).toBeNull();
});

test("swaps to the open-state icon while the popover is open", () => {
  const Closed: IconComponent = (p) => <svg data-testid="closed-icon" {...p} />;
  const Open: IconComponent = (p) => <svg data-testid="open-icon" {...p} />;
  renderTopBarPopover(false, { menuIcon: Closed, menuIconOpen: Open });
  expect(screen.getByTestId("closed-icon")).toBeTruthy();
  expect(screen.queryByTestId("open-icon")).toBeNull();
  cleanup();
  renderTopBarPopover(true, { menuIcon: Closed, menuIconOpen: Open });
  expect(screen.getByTestId("open-icon")).toBeTruthy();
  expect(screen.queryByTestId("closed-icon")).toBeNull();
});

test("open state falls back to a default icon (not the closed icon) when menuIconOpen is unset", () => {
  const Closed: IconComponent = (p) => <svg data-testid="closed-icon" {...p} />;
  renderTopBarPopover(true, { menuIcon: Closed });
  // Open uses the chevron default, so the closed override must not be showing.
  expect(screen.queryByTestId("closed-icon")).toBeNull();
});

test("shows the menu label text when menuLabelVisible, keeping it as the accessible name", () => {
  renderTopBarPopover(false, { menuLabel: "Navigation", menuLabelVisible: true });
  expect(screen.getByText("Navigation")).toBeTruthy();
  expect(screen.getByLabelText("Navigation")).toBeTruthy();
});

test("keeps the label invisible (accessible name only) when menuLabelVisible is off", () => {
  renderTopBarPopover(false, { menuLabel: "Navigation" });
  expect(screen.queryByText("Navigation")).toBeNull();
  expect(screen.getByLabelText("Navigation")).toBeTruthy();
});

test("renders a custom image/JSX label, still announcing the string accessible name", () => {
  renderTopBarPopover(false, {
    menuLabel: "Brand",
    menuLabelVisible: true,
    menuLabelContent: <img data-testid="label-img" alt="" src="x" />,
  });
  expect(screen.getByTestId("label-img")).toBeTruthy();
  expect(screen.getByLabelText("Brand")).toBeTruthy();
  // The custom content replaces the text label.
  expect(screen.queryByText("Brand")).toBeNull();
});

function renderFloatingTopBar() {
  return render(
    <MemoryRouter initialEntries={["/reports"]}>
      <FrameProvider value={{ title: "App", nav, crumbs: emptyResolvers } as unknown as FrameContextValue}>
        <TopBar title="App" onToggleSidebar={() => {}} floating />
      </FrameProvider>
    </MemoryRouter>,
  );
}

test("docked bar keeps its own background and carries no floating marker", () => {
  const { container } = renderTopBar("/reports");
  const header = container.querySelector("header") as HTMLElement;
  expect(header.className).toContain("bg-background");
  expect(header.className).toContain("border-b");
  expect(header.dataset.floating).toBeUndefined();
});

test("floating bar drops its background, leaves the flow, and marks itself for slot styling", () => {
  const { container } = renderFloatingTopBar();
  const header = container.querySelector("header") as HTMLElement;
  expect(header.dataset.floating).toBe("true");
  expect(header.className).toContain("absolute");
  expect(header.className).not.toContain("bg-background");
  expect(header.className).not.toContain("border-b");
});

test("floating bar lets clicks through to the content, except on its own clusters", () => {
  const { container } = renderFloatingTopBar();
  const header = container.querySelector("header") as HTMLElement;
  // The bar spans the full width over the content, so only the clusters may take a hit.
  expect(header.className).toContain("pointer-events-none");
  const cluster = screen.getByLabelText("Toggle sidebar").closest(".pointer-events-auto");
  expect(cluster).not.toBeNull();
  const crumbs = container.querySelector("[data-slot=breadcrumbs]") as HTMLElement;
  expect(crumbs.className).toContain("pointer-events-auto");
});

test("floating clusters carry their own pill background", () => {
  const { container } = renderFloatingTopBar();
  const crumbs = container.querySelector("[data-slot=breadcrumbs]") as HTMLElement;
  expect(crumbs.className).toContain("rounded-full");
  expect(crumbs.className).toContain("bg-background/80");
});

test("renders a centered top-bar slot region", () => {
  const { container } = renderTopBar("/");
  const center = container.querySelector("[data-slot=topbar-center]");
  expect(center).not.toBeNull();
  expect(center?.className).toContain("-translate-x-1/2");
});
