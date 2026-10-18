import { expect, test } from "bun:test";
import { drawerStyle, resolveContainer } from "./drawerStyles";

test("right (default) is a side sheet anchored at the end with a width", () => {
  const s = drawerStyle("right", "md", false);
  expect(s.contentClass).toContain("fixed");
  expect(s.contentClass).toContain("end-0");
  expect(s.contentClass).toContain("border-s");
  expect(s.sizeStyle).toEqual({ width: "24rem" });
});

test("left is a side sheet anchored at the start with a width", () => {
  const s = drawerStyle("left", "sm", false);
  expect(s.contentClass).toContain("start-0");
  expect(s.contentClass).toContain("border-e");
  expect(s.sizeStyle).toEqual({ width: "20rem" });
});

test("side sheets swap their slide animation under rtl", () => {
  const end = drawerStyle("right", "md", false).contentClass;
  expect(end).toContain("rtl:data-[state=open]:animate-[pf-drawer-in-left_300ms_ease-out]");
  expect(end).toContain("rtl:data-[state=closed]:animate-[pf-drawer-out-left_200ms_ease-in]");
  const start = drawerStyle("left", "md", false).contentClass;
  expect(start).toContain("rtl:data-[state=open]:animate-[pf-drawer-in-right_300ms_ease-out]");
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
