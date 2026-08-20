import { expect, test } from "bun:test";
import type { ComponentType } from "react";
import type { FramePlugin, FrameRoute } from "@picoframe/plugin-sdk";
import {
  buildCrumbResolvers,
  decodeSegment,
  isRoutePath,
  resolveCrumb,
  resolveCrumbSpan,
  titleCase,
} from "./crumbs";

const page = () => Promise.resolve({ default: (() => null) as ComponentType });

function plugin(
  id: string,
  routes: FrameRoute[],
  crumbs?: Record<string, string | string[]>,
): FramePlugin {
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

test("isRoutePath is true for a contributed route but false for a labeled route-less parent", () => {
  const r = buildCrumbResolvers([
    plugin("p", [{ path: "reports/archive/q1", lazy: page, crumb: "Q1" }], { "reports/archive": "Archived" }),
  ]);
  expect(isRoutePath(r, "/reports/archive/q1")).toBe(true);
  // Labeled by the static map, but no route exists there — not navigable.
  expect(isRoutePath(r, "/reports/archive")).toBe(false);
  expect(isRoutePath(r, "/reports")).toBe(false);
});

test("isRoutePath matches crumb-less routes, dynamic segments, and nested children", () => {
  const r = buildCrumbResolvers([
    plugin("p", [
      { path: "users/:id", lazy: page },
      { path: "hello", lazy: page, children: [{ path: "settings", lazy: page, crumb: "Settings" }] },
    ]),
  ]);
  expect(isRoutePath(r, "/users/42")).toBe(true);
  expect(isRoutePath(r, "/hello")).toBe(true);
  expect(isRoutePath(r, "/hello/settings")).toBe(true);
  expect(isRoutePath(r, "/nope")).toBe(false);
});

test("unmatched path resolves to undefined (caller falls back to titleCase)", () => {
  const r = buildCrumbResolvers([plugin("p", [{ path: "hello", lazy: page, crumb: "Hello" }])]);
  expect(resolveCrumb(r, "/unknown-area")).toBeUndefined();
  expect(titleCase("unknown-area")).toBe("Unknown Area");
});

test("a plugin's static crumb may be an array, giving a flat route a synthetic ancestor", () => {
  const r = buildCrumbResolvers([plugin("p", [{ path: "inbox", lazy: page }], { inbox: ["Catch-up", "Inbox"] })]);
  expect(resolveCrumb(r, "/inbox")).toEqual(["Catch-up", "Inbox"]);
});

test("a route's crumb function may return an array of labels", () => {
  const r = buildCrumbResolvers([
    plugin("p", [{ path: "orgs/:org", lazy: page, crumb: (c) => ["Organisations", c.params.org ?? ""] }]),
  ]);
  expect(resolveCrumb(r, "/orgs/acme")).toEqual(["Organisations", "acme"]);
});

test("crumbSpan is reported for the route that declares it, and defaults to 1", () => {
  const r = buildCrumbResolvers([
    plugin("p", [
      { path: ":owner/:name", lazy: page, crumb: (c) => `${c.params.owner}/${c.params.name}`, crumbSpan: 2 },
      { path: "hello", lazy: page, crumb: "Hello" },
    ]),
  ]);
  expect(resolveCrumbSpan(r, "/acme/repo")).toBe(2);
  expect(resolveCrumbSpan(r, "/hello")).toBe(1);
  expect(resolveCrumbSpan(r, "/unknown")).toBe(1);
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
