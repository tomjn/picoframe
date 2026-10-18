import { expect, test } from "bun:test";
import { House, Settings } from "lucide-react";
import { defaultStrings } from "./strings/defaultStrings";
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

test("a translated Home label reaches the nav item and the crumb", () => {
  const p = homePlugin(undefined, { ...defaultStrings, home: "Startseite" });
  expect(p.nav?.[0].items[0].label).toBe("Startseite");
  expect(p.routes[0].crumb).toBe("Startseite");
});

test("a translated Home label applies to a component override with no label", () => {
  const p = homePlugin(() => null, { ...defaultStrings, home: "Startseite" });
  expect(p.nav?.[0].items[0].label).toBe("Startseite");
  expect(p.routes[0].crumb).toBe("Startseite");
});

test("the host's home label wins over the table", () => {
  const p = homePlugin({ label: "Dashboard" }, { ...defaultStrings, home: "Startseite" });
  expect(p.nav?.[0].items[0].label).toBe("Dashboard");
  expect(p.routes[0].crumb).toBe("Dashboard");
});

test("the English table still resolves to the built-in framePlugin", () => {
  expect(homePlugin(undefined, defaultStrings)).toBe(framePlugin);
});
