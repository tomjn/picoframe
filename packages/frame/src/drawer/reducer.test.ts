import { expect, test } from "bun:test";
import { type DrawerState, drawerReducer, initialDrawerState } from "./reducer";

const opts = { content: "hello", title: "T" } as const;

test("initial state is closed with no options", () => {
  expect(initialDrawerState).toEqual({ isOpen: false, options: null });
});

test("open sets isOpen and stores the options", () => {
  const next = drawerReducer(initialDrawerState, { type: "open", options: opts });
  expect(next.isOpen).toBe(true);
  expect(next.options).toBe(opts);
});

test("close clears isOpen but retains options for the exit animation", () => {
  const open: DrawerState = { isOpen: true, options: opts };
  const next = drawerReducer(open, { type: "close" });
  expect(next.isOpen).toBe(false);
  expect(next.options).toBe(opts);
});

test("open replaces the previous options", () => {
  const open: DrawerState = { isOpen: true, options: opts };
  const other = { content: "other" } as const;
  const next = drawerReducer(open, { type: "open", options: other });
  expect(next.options).toBe(other);
});
