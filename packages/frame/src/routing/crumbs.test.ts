import { expect, test } from "bun:test";
import type { ComponentType } from "react";
import type { FramePlugin, FrameRoute } from "@picoframe/plugin-sdk";
import {
  buildCrumbResolvers,
  buildCrumbTrail,
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

test("the trail links navigable ancestors and leaves the current crumb as text", () => {
  const r = buildCrumbResolvers([
    plugin("p", [
      { path: "reports", lazy: page, crumb: "Reports" },
      { path: "reports/q1", lazy: page, crumb: "Q1" },
    ]),
  ]);
  expect(buildCrumbTrail(r, "/reports/q1").crumbs).toEqual([
    { label: "Reports", to: "/reports" },
    { label: "Q1", to: undefined },
  ]);
});

test("the trail falls back to a title-cased segment and expands an array crumb", () => {
  const r = buildCrumbResolvers([plugin("p", [{ path: "inbox", lazy: page }], { inbox: ["Catch-up", "Inbox"] })]);
  expect(buildCrumbTrail(r, "/inbox").crumbs).toEqual([
    { label: "Catch-up", to: undefined },
    { label: "Inbox", to: undefined },
  ]);
  expect(buildCrumbTrail(r, "/nothing-here").crumbs).toEqual([{ label: "Nothing Here", to: undefined }]);
});

test("a crumbSpan route merges the segments it covers into one trail entry", () => {
  const r = buildCrumbResolvers([
    plugin("p", [{ path: ":owner/:name", lazy: page, crumb: (c) => `${c.params.owner}/${c.params.name}`, crumbSpan: 2 }]),
  ]);
  expect(buildCrumbTrail(r, "/acme/repo").crumbs).toEqual([{ label: "acme/repo", to: undefined }]);
});

// The `dynamic` flag is what the top bar subscribes on: a function may read a name the
// user is about to change, a string or an array cannot.
test("a path is dynamic when any crumb on it is a function, and not otherwise", () => {
  const r = buildCrumbResolvers([
    plugin("p", [
      { path: "users", lazy: page, crumb: "Users" },
      { path: "users/:id", lazy: page, crumb: (c) => `User ${c.params.id}` },
      { path: "about", lazy: page, crumb: ["Help", "About"] },
    ]),
  ]);
  expect(buildCrumbTrail(r, "/users/42").dynamic).toBe(true);
  expect(buildCrumbTrail(r, "/users").dynamic).toBe(false);
  expect(buildCrumbTrail(r, "/about").dynamic).toBe(false);
  // Title-cased fallbacks call nothing, so an unknown path has nothing to follow.
  expect(buildCrumbTrail(r, "/unknown").dynamic).toBe(false);
});

test("a static label beating a function crumb leaves the path static", () => {
  const r = buildCrumbResolvers([
    plugin("p", [{ path: "users/:id", lazy: page, crumb: (c) => `User ${c.params.id}` }], { "/users/42": "Ada" }),
  ]);
  expect(buildCrumbTrail(r, "/users/42").crumbs.at(-1)).toEqual({ label: "Ada", to: undefined });
  expect(buildCrumbTrail(r, "/users/42").dynamic).toBe(false);
});

test("the trail re-reads a function crumb on every call, so a renamed thing renames", () => {
  let name = "Old name";
  const r = buildCrumbResolvers([plugin("p", [{ path: "projects/:id", lazy: page, crumb: () => name }])]);
  expect(buildCrumbTrail(r, "/projects/1").crumbs.at(-1)?.label).toBe("Old name");
  name = "New name";
  expect(buildCrumbTrail(r, "/projects/1").crumbs.at(-1)?.label).toBe("New name");
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
