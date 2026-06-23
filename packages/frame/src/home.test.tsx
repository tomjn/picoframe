import { expect, test } from "bun:test";
import { House, Settings } from "lucide-react";
import { framePlugin } from "./framePlugin";
import { homePlugin } from "./home";

test("default (undefined) resolves to the built-in framePlugin", () => {
  expect(homePlugin(undefined)).toBe(framePlugin);
});

test("disabled (false): an index route, no nav item", () => {
  const p = homePlugin(false);
  expect(p.nav).toBeUndefined();
  expect(p.routes).toHaveLength(1);
  expect(p.routes[0].index).toBe(true);
});

test("component override: custom page, default Home nav item", () => {
  const Custom = () => null;
  const p = homePlugin(Custom);
  expect(p.routes[0].index).toBe(true);
  expect(p.nav?.[0].items[0].label).toBe("Home");
  expect(p.nav?.[0].items[0].icon).toBe(House);
});

test("object override: customizes the nav item label and icon", () => {
  const p = homePlugin({ label: "Dashboard", icon: Settings });
  expect(p.nav?.[0].items[0].label).toBe("Dashboard");
  expect(p.nav?.[0].items[0].icon).toBe(Settings);
  expect(p.routes[0].crumb).toBe("Dashboard");
});
