import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { NavGroup } from "@picoframe/plugin-sdk";
import { FrameProvider, type FrameContextValue } from "../context/frame";
import { PersistentStoreProvider, useSetting } from "../settings/SettingsStoreProvider";
import { memoryStorage } from "../settings/storage";
import Home from "./Home";

afterEach(cleanup);

const StarIcon = ({ className }: { size?: number; className?: string }) => (
  <svg data-testid="icon-star" className={className} />
);
const BoltIcon = ({ className }: { size?: number; className?: string }) => (
  <svg data-testid="icon-bolt" className={className} />
);

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

test("card shows a static description as sub-text, and never the path", () => {
  renderHome([
    { id: "main", items: [{ id: "a", label: "Alpha", to: "/alpha", description: "Does alpha things" }] },
  ]);
  expect(screen.getByText("Does alpha things")).toBeTruthy();
  expect(screen.queryByText("/alpha")).toBeNull();
});

test("card shows no sub-text (and no path) when there is no description", () => {
  renderHome([{ id: "main", items: [{ id: "a", label: "Alpha", to: "/alpha" }] }]);
  expect(screen.getByText("Alpha")).toBeTruthy();
  expect(screen.queryByText("/alpha")).toBeNull();
});

test("card uses useLabel and useIcon over the statics", () => {
  const { container } = renderHome([
    {
      id: "main",
      items: [{ id: "a", label: "Static", to: "/a", useLabel: () => "Dynamic", icon: StarIcon, useIcon: () => BoltIcon }],
    },
  ]);
  expect(screen.getByText("Dynamic")).toBeTruthy();
  expect(screen.queryByText("Static")).toBeNull();
  expect(container.querySelector("[data-testid=icon-bolt]")).not.toBeNull();
  expect(container.querySelector("[data-testid=icon-star]")).toBeNull();
});

test("card uses useDescription over the static description, live", () => {
  const nav: NavGroup[] = [
    {
      id: "main",
      items: [
        {
          id: "a",
          label: "Alpha",
          to: "/a",
          description: "static",
          useDescription: () => (useSetting("open", false)[0] ? "open" : "closed"),
        },
      ],
    },
  ];
  function Toggle() {
    const [open, setOpen] = useSetting("open", false);
    return (
      <button type="button" onClick={() => setOpen(!open)}>
        toggle
      </button>
    );
  }
  render(
    <PersistentStoreProvider storage={memoryStorage()}>
      <MemoryRouter>
        <FrameProvider value={{ title: "App", nav } as unknown as FrameContextValue}>
          <Toggle />
          <Home />
        </FrameProvider>
      </MemoryRouter>
    </PersistentStoreProvider>,
  );
  expect(screen.getByText("closed")).toBeTruthy();
  expect(screen.queryByText("static")).toBeNull();
  fireEvent.click(screen.getByText("toggle"));
  expect(screen.getByText("open")).toBeTruthy();
});
