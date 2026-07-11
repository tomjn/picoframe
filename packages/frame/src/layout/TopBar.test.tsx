import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { FrameProvider, type FrameContextValue } from "../context/frame";
import type { CrumbResolvers } from "../routing/crumbs";
import { TopBar } from "./TopBar";

afterEach(cleanup);

const emptyResolvers: CrumbResolvers = { static: new Map(), patterns: [], routes: [] };

function renderTopBar(path: string, breadcrumbCollapsed = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FrameProvider value={{ title: "App", crumbs: emptyResolvers } as unknown as FrameContextValue}>
        <TopBar title="App" onToggleSidebar={() => {}} breadcrumbCollapsed={breadcrumbCollapsed} />
      </FrameProvider>
    </MemoryRouter>,
  );
}

test("full breadcrumb shows every crumb with no hover wrapper", () => {
  const { container } = renderTopBar("/reports/archive", false);
  expect(screen.getByText("Reports")).toBeTruthy();
  expect(screen.getByText("Archive")).toBeTruthy();
  expect(container.querySelector("[data-crumb-ancestors]")).toBeNull();
});

test("collapsed breadcrumb keeps ancestors in the DOM, wrapped for hover reveal", () => {
  renderTopBar("/reports/archive", true);
  // Current page always visible.
  expect(screen.getByText("Archive")).toBeTruthy();
  // Ancestor stays in the DOM (keyboard/screen-reader can reach it), not removed.
  const ancestor = screen.getByText("Reports").closest("[data-crumb-ancestors]");
  expect(ancestor).not.toBeNull();
  expect(ancestor?.className).toContain("group-hover:grid-cols-[1fr]");
  expect(ancestor?.className).toContain("group-focus-within:grid-cols-[1fr]");
});

test("collapsed breadcrumb with a single crumb just shows it (no wrapper)", () => {
  const { container } = renderTopBar("/reports", true);
  expect(screen.getByText("Reports")).toBeTruthy();
  expect(container.querySelector("[data-crumb-ancestors]")).toBeNull();
});
