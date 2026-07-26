import { afterEach, expect, test } from "bun:test";
import { act, cleanup, render, screen } from "@testing-library/react";
import { SIDEBAR_NARROW_BREAKPOINT, useNarrowViewport } from "./useNarrowViewport";

// The viewport is shared global state across every test file, so put it back afterwards.
const DEFAULT_WIDTH = window.innerWidth;

afterEach(() => {
  cleanup();
  setWidth(DEFAULT_WIDTH);
});

function setWidth(width: number) {
  act(() => {
    window.happyDOM.setViewport({ width });
  });
}

function Probe({ breakpoint }: { breakpoint?: number }) {
  return <span data-testid="narrow">{String(useNarrowViewport(breakpoint))}</span>;
}

const narrow = () => screen.getByTestId("narrow").textContent;

test("reports the width on the first render, with no post-mount correction", () => {
  setWidth(500);
  render(<Probe />);
  expect(narrow()).toBe("true");
});

test("flips as the viewport crosses the breakpoint", () => {
  setWidth(1024);
  render(<Probe />);
  expect(narrow()).toBe("false");

  setWidth(500);
  expect(narrow()).toBe("true");

  setWidth(1024);
  expect(narrow()).toBe("false");
});

test("a custom breakpoint overrides the default", () => {
  setWidth(800);
  render(<Probe breakpoint={900} />);
  // Wide by the 640 default, narrow by the app's own threshold.
  expect(narrow()).toBe("true");

  setWidth(950);
  expect(narrow()).toBe("false");
});

test("the breakpoint itself counts as wide", () => {
  setWidth(SIDEBAR_NARROW_BREAKPOINT);
  render(<Probe />);
  expect(narrow()).toBe("false");

  setWidth(SIDEBAR_NARROW_BREAKPOINT - 1);
  expect(narrow()).toBe("true");
});
