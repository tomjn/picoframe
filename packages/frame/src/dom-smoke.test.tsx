import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

afterEach(cleanup);

test("happy-dom harness can render a React component", () => {
  render(<div>harness-ok</div>);
  expect(screen.getByText("harness-ok")).toBeTruthy();
});
