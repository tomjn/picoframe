import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { usePersistentState } from "./usePersistentState";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function Reader({ testid, k }: { testid: string; k: string }) {
  const [value] = usePersistentState(k, false);
  return <span data-testid={testid}>{String(value)}</span>;
}

function Writer({ k, to }: { k: string; to: boolean }) {
  const [, set] = usePersistentState(k, false);
  return (
    <button type="button" onClick={() => set(to)}>
      set
    </button>
  );
}

test("same-key instances stay in sync live, without a reload", () => {
  render(
    <>
      <Reader testid="a" k="picoframe.layout.popover" />
      <Writer k="picoframe.layout.popover" to={true} />
    </>,
  );
  expect(screen.getByTestId("a").textContent).toBe("false");
  fireEvent.click(screen.getByText("set"));
  // The reader instance must reflect the writer's change immediately.
  expect(screen.getByTestId("a").textContent).toBe("true");
});

test("a new instance reads the persisted value", () => {
  render(<Writer k="k" to={true} />);
  fireEvent.click(screen.getByText("set"));
  // Mounting a fresh reader afterwards seeds from localStorage.
  render(<Reader testid="b" k="k" />);
  expect(screen.getByTestId("b").textContent).toBe("true");
});

test("independent keys do not cross-notify", () => {
  render(
    <>
      <Reader testid="a" k="one" />
      <Writer k="two" to={true} />
    </>,
  );
  fireEvent.click(screen.getByText("set"));
  expect(screen.getByTestId("a").textContent).toBe("false");
});
