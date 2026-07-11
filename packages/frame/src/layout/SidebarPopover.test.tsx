import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import type { NavGroup } from "@picoframe/plugin-sdk";
import { SidebarPopover } from "./SidebarPopover";

afterEach(cleanup);

const oneItem: NavGroup[] = [{ id: "main", items: [{ id: "a", label: "Alpha", to: "/a" }] }];

function renderPopover(open: boolean, onClose: () => void, extra?: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      {extra}
      <SidebarPopover groups={oneItem} open={open} onClose={onClose} />
    </MemoryRouter>,
  );
}

test("renders the nav (with labels) when open", () => {
  renderPopover(true, () => {});
  expect(screen.getByText("Alpha")).toBeTruthy();
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
