import { expect, test } from "bun:test";
import { drawerStyle, resolveContainer } from "./drawerStyles";

test("right (default) is a side sheet anchored right with a width", () => {
  const s = drawerStyle("right", "md", false);
  expect(s.contentClass).toContain("fixed");
  expect(s.contentClass).toContain("right-0");
  expect(s.contentClass).toContain("border-l");
  expect(s.sizeStyle).toEqual({ width: "24rem" });
});

test("left is a side sheet anchored left with a width", () => {
  const s = drawerStyle("left", "sm", false);
  expect(s.contentClass).toContain("left-0");
  expect(s.contentClass).toContain("border-r");
  expect(s.sizeStyle).toEqual({ width: "20rem" });
});

test("bottom is a bottom sheet anchored bottom with a height", () => {
  const s = drawerStyle("bottom", "lg", false);
  expect(s.contentClass).toContain("bottom-0");
  expect(s.contentClass).toContain("inset-x-0");
  expect(s.contentClass).toContain("border-t");
  expect(s.sizeStyle).toEqual({ height: "75%" });
});

test("sizes map to distinct widths for side sheets", () => {
  const widths = (["sm", "md", "lg", "full"] as const).map(
    (size) => drawerStyle("right", size, false).sizeStyle.width,
  );
  expect(new Set(widths).size).toBe(4);
  expect(widths.at(-1)).toBe("100%");
});

test("contained swaps fixed for absolute so the panel stays inside its container", () => {
  expect(drawerStyle("right", "md", true).contentClass).toContain("absolute");
  expect(drawerStyle("right", "md", true).contentClass).not.toContain("fixed");
});

test("resolveContainer: per-open option wins over the provider default", () => {
  const option = document.createElement("div");
  const provider = document.createElement("section");
  expect(resolveContainer(option, provider)).toBe(option);
});

test("resolveContainer: falls back to the provider default when no option", () => {
  const provider = document.createElement("section");
  expect(resolveContainer(undefined, provider)).toBe(provider);
});

test("resolveContainer: null when neither is set (Radix defaults to body)", () => {
  expect(resolveContainer(undefined, undefined)).toBeNull();
});

test("resolveContainer: calls function containers lazily", () => {
  const el = document.createElement("div");
  expect(resolveContainer(() => el, undefined)).toBe(el);
  expect(resolveContainer(() => null, undefined)).toBeNull();
});
