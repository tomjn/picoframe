import { expect, test } from "bun:test";
import type { ComponentType } from "react";
import type { FramePlugin, FrameRoute } from "@picoframe/plugin-sdk";
import { buildCrumbResolvers, decodeSegment, resolveCrumb, titleCase } from "./crumbs";

const page = () => Promise.resolve({ default: (() => null) as ComponentType });

function plugin(id: string, routes: FrameRoute[], crumbs?: Record<string, string>): FramePlugin {
  return { id, version: "0", routes, crumbs };
}

test("string crumb on a route resolves at its absolute path", () => {
  const r = buildCrumbResolvers([plugin("p", [{ path: "hello", lazy: page, crumb: "Hello" }])]);
  expect(resolveCrumb(r, "/hello")).toBe("Hello");
});

test("nested children compose into full crumb paths", () => {
  const r = buildCrumbResolvers([
    plugin("p", [
      { path: "hello", lazy: page, crumb: "Hello", children: [{ path: "settings", lazy: page, crumb: "Settings" }] },
    ]),
  ]);
  expect(resolveCrumb(r, "/hello")).toBe("Hello");
  expect(resolveCrumb(r, "/hello/settings")).toBe("Settings");
});

test("static plugin crumbs label parent paths that are not routes", () => {
  const r = buildCrumbResolvers([
    plugin("p", [{ path: "reports/archive/q1", lazy: page, crumb: "Q1" }], { "reports/archive": "Archived" }),
  ]);
  // The intermediate segment has no route, but the static map supplies its label.
  expect(resolveCrumb(r, "/reports/archive")).toBe("Archived");
  expect(resolveCrumb(r, "/reports/archive/q1")).toBe("Q1");
});

test("function crumb receives matched route params for dynamic segments", () => {
  const r = buildCrumbResolvers([
    plugin("p", [{ path: "users/:id", lazy: page, crumb: (c) => `User ${c.params.id}` }]),
  ]);
  expect(resolveCrumb(r, "/users/42")).toBe("User 42");
});

test("static label wins over a matching route pattern", () => {
  const r = buildCrumbResolvers([
    plugin("p", [{ path: "users/:id", lazy: page, crumb: "Dynamic" }], { "/users/42": "Ada" }),
  ]);
  expect(resolveCrumb(r, "/users/42")).toBe("Ada");
});

test("unmatched path resolves to undefined (caller falls back to titleCase)", () => {
  const r = buildCrumbResolvers([plugin("p", [{ path: "hello", lazy: page, crumb: "Hello" }])]);
  expect(resolveCrumb(r, "/unknown-area")).toBeUndefined();
  expect(titleCase("unknown-area")).toBe("Unknown Area");
});

test("decodeSegment turns encoded path segments into readable text", () => {
  expect(decodeSegment("my%20page")).toBe("my page");
  expect(decodeSegment("reports")).toBe("reports");
  // Then title-cased for a fallback crumb: "my page" -> "My Page".
  expect(titleCase(decodeSegment("my%20page"))).toBe("My Page");
});

test("decodeSegment falls back to the raw segment on malformed encoding", () => {
  expect(decodeSegment("100%")).toBe("100%");
});
