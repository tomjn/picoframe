import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SIDEBAR_COLLAPSED_KEY, useSidebarState } from "./useSidebarState";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function Panel({ testid }: { testid: string }) {
  const { collapsed, toggle, setCollapsed } = useSidebarState();
  return (
    <div>
      <span data-testid={testid}>{String(collapsed)}</span>
      <button type="button" onClick={toggle}>
        toggle
      </button>
      <button type="button" onClick={() => setCollapsed(true)}>
        collapse
      </button>
    </div>
  );
}

test("defaults to expanded (collapsed=false)", () => {
  render(<Panel testid="a" />);
  expect(screen.getByTestId("a").textContent).toBe("false");
});

test("toggle flips the collapsed state", () => {
  render(<Panel testid="a" />);
  fireEvent.click(screen.getByText("toggle"));
  expect(screen.getByTestId("a").textContent).toBe("true");
  fireEvent.click(screen.getByText("toggle"));
  expect(screen.getByTestId("a").textContent).toBe("false");
});

test("setCollapsed sets an explicit value", () => {
  render(<Panel testid="a" />);
  fireEvent.click(screen.getByText("collapse"));
  expect(screen.getByTestId("a").textContent).toBe("true");
});

test("separate consumers stay in sync live via the shared key", () => {
  render(
    <>
      <Panel testid="a" />
      <Panel testid="b" />
    </>,
  );
  // A toggle from the first consumer is reflected in the second immediately.
  fireEvent.click(screen.getAllByText("toggle")[0]);
  expect(screen.getByTestId("a").textContent).toBe("true");
  expect(screen.getByTestId("b").textContent).toBe("true");
});

test("persists to localStorage under the exported key", () => {
  render(<Panel testid="a" />);
  fireEvent.click(screen.getByText("collapse"));
  expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe("true");
});
