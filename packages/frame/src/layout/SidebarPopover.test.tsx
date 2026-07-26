import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import type { NavGroup } from "@picoframe/plugin-sdk";
import { SidebarPopover } from "./SidebarPopover";

afterEach(cleanup);

const oneItem: NavGroup[] = [{ id: "main", items: [{ id: "a", label: "Alpha", to: "/a" }] }];

function renderPopover(open: boolean, onClose: () => void, extra?: React.ReactNode, fullscreen = false) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      {extra}
      <SidebarPopover groups={oneItem} open={open} onClose={onClose} fullscreen={fullscreen} />
    </MemoryRouter>,
  );
}

test("renders the nav (with labels) when open", () => {
  renderPopover(true, () => {});
  expect(screen.getByText("Alpha")).toBeTruthy();
});

test("opens as an anchored dropdown, not a dimmed full-height drawer", () => {
  const { container } = renderPopover(true, () => {});
  const panel = container.querySelector("[data-slot=sidebar-popover]") as HTMLElement | null;
  expect(panel).not.toBeNull();
  // Anchored directly beneath its trigger, not pinned across the full viewport height.
  expect(panel?.className).toContain("top-full");
  expect(panel?.className).not.toContain("inset-y-0");
  // Outside-click catcher must not dim the page.
  const catcher = screen.getByLabelText("Close menu");
  expect(catcher.className).not.toContain("bg-black");
});

test("fullscreen fills the viewport below the top bar instead of anchoring", () => {
  const { container } = renderPopover(true, () => {}, undefined, true);
  const panel = container.querySelector("[data-slot=sidebar-popover]") as HTMLElement | null;
  // Pinned under the 48px top bar (h-12), so the menu button stays clickable.
  expect(panel?.className).toContain("top-12");
  expect(panel?.className).toContain("bottom-0");
  // None of the anchored card's sizing survives.
  expect(panel?.className).not.toContain("w-64");
  expect(panel?.className).not.toContain("top-full");
});

test("renders nothing when closed", () => {
  renderPopover(false, () => {});
  expect(screen.queryByText("Alpha")).toBeNull();
});

test("Escape closes the popover", () => {
  let closed = 0;
  renderPopover(true, () => {
    closed++;
  });
  fireEvent.keyDown(window, { key: "Escape" });
  expect(closed).toBe(1);
});

test("clicking the backdrop closes the popover", () => {
  let closed = 0;
  renderPopover(true, () => {
    closed++;
  });
  fireEvent.click(screen.getByLabelText("Close menu"));
  expect(closed).toBe(1);
});

test("navigating closes the popover, but mounting does not", () => {
  let closed = 0;
  function Go() {
    const navigate = useNavigate();
    return (
      <button type="button" onClick={() => navigate("/a")}>
        go
      </button>
    );
  }
  renderPopover(
    true,
    () => {
      closed++;
    },
    <Go />,
  );
  // Just mounting at the initial path must not trigger a close.
  expect(closed).toBe(0);
  fireEvent.click(screen.getByText("go"));
  expect(closed).toBe(1);
});
