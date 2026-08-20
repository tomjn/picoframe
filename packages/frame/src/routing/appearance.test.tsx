import { afterEach, beforeEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { type ComponentType, type ReactNode, useEffect } from "react";
import type { FramePlugin, FrameRoute } from "@picoframe/plugin-sdk";
import { ThemeProvider } from "../context/theme";
import { type AppearanceRule, RouteAppearance, buildAppearanceRules, resolveAppearance } from "./appearance";

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

const page = () => Promise.resolve({ default: (() => null) as ComponentType });

function plugin(routes: FrameRoute[]): FramePlugin {
  return { id: "p", version: "0", routes };
}

test("a route with no appearance leaves the user's theme alone", () => {
  const rules = buildAppearanceRules([plugin([{ path: "hello", lazy: page }])]);
  expect(rules).toEqual([]);
  expect(resolveAppearance(rules, "/hello")).toBeNull();
});

test("a route's appearance applies on its own path and nowhere else", () => {
  const rules = buildAppearanceRules([
    plugin([
      { path: "canvas", lazy: page, appearance: "dark" },
      { path: "hello", lazy: page },
    ]),
  ]);
  expect(resolveAppearance(rules, "/canvas")).toBe("dark");
  expect(resolveAppearance(rules, "/hello")).toBeNull();
});

test("appearance resolves through route params", () => {
  const rules = buildAppearanceRules([plugin([{ path: "boards/:id", lazy: page, appearance: "dark" }])]);
  expect(resolveAppearance(rules, "/boards/42")).toBe("dark");
});

test("a parent route's appearance covers its children", () => {
  const rules = buildAppearanceRules([
    plugin([
      {
        path: "studio",
        lazy: page,
        appearance: "dark",
        children: [{ path: "assets", lazy: page }],
      },
    ]),
  ]);
  expect(resolveAppearance(rules, "/studio")).toBe("dark");
  expect(resolveAppearance(rules, "/studio/assets")).toBe("dark");
});

test("the most specific matching route wins over an ancestor", () => {
  const rules = buildAppearanceRules([
    plugin([
      {
        path: "studio",
        lazy: page,
        appearance: "dark",
        children: [{ path: "print", lazy: page, appearance: "light" }],
      },
    ]),
  ]);
  expect(resolveAppearance(rules, "/studio/print")).toBe("light");
});

test("an index route does not claim the whole app", () => {
  const rules = buildAppearanceRules([
    plugin([{ index: true, lazy: page, appearance: "dark" }, { path: "hello", lazy: page }]),
  ]);
  expect(resolveAppearance(rules, "/")).toBe("dark");
  expect(resolveAppearance(rules, "/hello")).toBeNull();
});

const darkCanvas: AppearanceRule[] = [{ pattern: "/canvas", end: true, appearance: "dark" }];

function renderAt(path: string, rules: AppearanceRule[], extra?: ReactNode) {
  return render(
    <ThemeProvider defaultMode="light">
      <MemoryRouter initialEntries={[path]}>
        <RouteAppearance rules={rules} />
        {extra}
      </MemoryRouter>
    </ThemeProvider>,
  );
}

test("a route's dark appearance wins over the user's light theme", () => {
  renderAt("/canvas", darkCanvas);
  expect(document.documentElement.classList.contains("dark")).toBe(true);
});

test("a route with no override leaves the user's theme applied", () => {
  renderAt("/hello", darkCanvas);
  expect(document.documentElement.classList.contains("dark")).toBe(false);
});

test("the override is dropped again on navigating away", () => {
  function GoHome() {
    const navigate = useNavigate();
    useEffect(() => {
      navigate("/hello");
    }, [navigate]);
    return null;
  }
  renderAt("/canvas", darkCanvas, <GoHome />);
  expect(document.documentElement.classList.contains("dark")).toBe(false);
});

test("a light route stays light under a dark user theme", () => {
  render(
    <ThemeProvider defaultMode="dark">
      <MemoryRouter initialEntries={["/print"]}>
        <RouteAppearance rules={[{ pattern: "/print", end: true, appearance: "light" }]} />
      </MemoryRouter>
    </ThemeProvider>,
  );
  expect(document.documentElement.classList.contains("dark")).toBe(false);
});
