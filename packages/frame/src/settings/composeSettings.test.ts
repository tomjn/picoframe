import { expect, test } from "bun:test";
import type { FramePlugin, SettingsSection } from "@picoframe/plugin-sdk";
import { composeSettings } from "./composeSettings";

function plugin(id: string, settings: SettingsSection[]): FramePlugin {
  return { id, version: "0", routes: [], settings };
}

test("top-level sections become nodes sorted by order", () => {
  const { nodes } = composeSettings([
    plugin("a", [
      { id: "b", title: "B", order: 20 },
      { id: "a", title: "A", order: 10 },
    ]),
  ]);
  expect(nodes.map((n) => n.id)).toEqual(["a", "b"]);
});

test("siblings with equal order sort by title", () => {
  const { nodes } = composeSettings([
    plugin("p", [
      { id: "z", title: "Zebra" },
      { id: "m", title: "Apple" },
    ]),
  ]);
  expect(nodes.map((n) => n.title)).toEqual(["Apple", "Zebra"]);
});

test("parent nests a section under its category", () => {
  const { nodes } = composeSettings([
    plugin("p", [
      { id: "engine", title: "Engine" },
      { id: "engine.graphics", title: "Graphics", parent: "engine" },
    ]),
  ]);
  expect(nodes).toHaveLength(1);
  expect(nodes[0].id).toBe("engine");
  expect(nodes[0].children.map((c) => c.id)).toEqual(["engine.graphics"]);
});

test("a plugin can attach a subsection to a category another plugin owns", () => {
  const { nodes, byId } = composeSettings([
    plugin("core", [{ id: "engine", title: "Engine" }]),
    plugin("gfx", [{ id: "engine.graphics", title: "Graphics", parent: "engine" }]),
  ]);
  expect(nodes).toHaveLength(1);
  expect(byId.get("engine")?.children.map((c) => c.id)).toEqual(["engine.graphics"]);
});

test("same-id sections merge, first declarer wins and later fills unset fields", () => {
  const icon = (() => null) as unknown as SettingsSection["icon"];
  const { byId } = composeSettings([
    plugin("a", [{ id: "x", title: "First" }]),
    plugin("b", [{ id: "x", title: "Second", icon, description: "desc" }]),
  ]);
  const node = byId.get("x");
  expect(node?.title).toBe("First");
  expect(node?.icon).toBe(icon);
  expect(node?.description).toBe("desc");
});

test("orphan parent is treated as top-level", () => {
  const { nodes } = composeSettings([
    plugin("p", [{ id: "lonely", title: "Lonely", parent: "missing" }]),
  ]);
  expect(nodes.map((n) => n.id)).toEqual(["lonely"]);
});

test("byId exposes every node for deep-link lookup", () => {
  const { byId } = composeSettings([
    plugin("p", [
      { id: "engine", title: "Engine" },
      { id: "engine.graphics", title: "Graphics", parent: "engine" },
    ]),
  ]);
  expect(byId.size).toBe(2);
  expect(byId.get("engine.graphics")?.title).toBe("Graphics");
});
