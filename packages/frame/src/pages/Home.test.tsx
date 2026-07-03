import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { NavGroup } from "@picoframe/plugin-sdk";
import { FrameProvider, type FrameContextValue } from "../context/frame";
import Home from "./Home";

afterEach(cleanup);

function renderHome(nav: NavGroup[]) {
  // Home only reads `nav` and `title`; the rest of the context is irrelevant here.
  return render(
    <MemoryRouter>
      <FrameProvider value={{ title: "App", nav } as unknown as FrameContextValue}>
        <Home />
      </FrameProvider>
    </MemoryRouter>,
  );
}

test("launcher hides a card whose useVisible returns false, keeps visible siblings", () => {
  renderHome([
    {
      id: "main",
      items: [
        { id: "frame.home", label: "Home", to: "/" },
        { id: "a", label: "Alpha", to: "/a" },
        { id: "b", label: "Beta", to: "/b", useVisible: () => false },
      ],
    },
  ]);
  expect(screen.getByText("Alpha")).toBeTruthy();
  expect(screen.queryByText("Beta")).toBeNull();
});

test("launcher marks only visible cards with data-nav-item (drives section collapse)", () => {
  const { container } = renderHome([
    {
      id: "dev",
      label: "Dev Tools",
      items: [
        { id: "x", label: "Inspector", to: "/x", useVisible: () => true },
        { id: "y", label: "Logs", to: "/y", useVisible: () => false },
      ],
    },
  ]);
  expect(container.querySelectorAll("[data-nav-item]").length).toBe(1);
  expect(screen.getByText("Inspector")).toBeTruthy();
  expect(screen.queryByText("Logs")).toBeNull();
  // The section carries the CSS collapse rule so an all-hidden group would disappear.
  expect(container.querySelector("section")?.className).toContain("has-[[data-nav-item]]:block");
});
