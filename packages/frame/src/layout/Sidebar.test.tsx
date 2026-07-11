import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { NavGroup } from "@picoframe/plugin-sdk";
import { Sidebar } from "./Sidebar";
import { PersistentStoreProvider, useSetting } from "../settings/SettingsStoreProvider";
import { memoryStorage } from "../settings/storage";

afterEach(cleanup);

function renderSidebar(groups: NavGroup[]) {
  return render(
    <MemoryRouter>
      <Sidebar groups={groups} collapsed={false} width={200} onResize={() => {}} />
    </MemoryRouter>,
  );
}

const oneItem: NavGroup[] = [{ id: "main", items: [{ id: "a", label: "Alpha", to: "/a" }] }];

test("collapsed rail still renders nav item icons", () => {
  const { container } = render(
    <MemoryRouter>
      <Sidebar groups={oneItem} collapsed width={200} onResize={() => {}} />
    </MemoryRouter>,
  );
  expect(container.querySelector("[data-nav-item]")).not.toBeNull();
});

test("hideWhenCollapsed drops nav content entirely and zeroes the width", () => {
  const { container } = render(
    <MemoryRouter>
      <Sidebar groups={oneItem} collapsed width={200} onResize={() => {}} hideWhenCollapsed />
    </MemoryRouter>,
  );
  expect(container.querySelector("[data-nav-item]")).toBeNull();
  expect(container.querySelector("[data-slot=sidebar]")?.className).toContain("w-0");
});

test("hideWhenCollapsed has no effect while expanded", () => {
  const { container } = render(
    <MemoryRouter>
      <Sidebar groups={oneItem} collapsed={false} width={200} onResize={() => {}} hideWhenCollapsed />
    </MemoryRouter>,
  );
  expect(container.querySelector("[data-nav-item]")).not.toBeNull();
});

test("hides an item whose useVisible returns false, keeps visible siblings", () => {
  renderSidebar([
    {
      id: "main",
      items: [
        { id: "a", label: "Always", to: "/a" },
        { id: "b", label: "Hidden", to: "/b", useVisible: () => false },
      ],
    },
  ]);
  expect(screen.getByText("Always")).toBeTruthy();
  expect(screen.queryByText("Hidden")).toBeNull();
});

test("collapses the group when every item is hidden (no visible nav items, group stays hidden)", () => {
  const { container } = renderSidebar([
    {
      id: "dev",
      label: "Dev Tools",
      items: [
        { id: "x", label: "Inspector", to: "/x", useVisible: () => false },
        { id: "y", label: "Logs", to: "/y", useVisible: () => false },
      ],
    },
  ]);
  // Both items self-hide, so nothing carries [data-nav-item]; the group's CSS rule
  // (`hidden ... has-[[data-nav-item]]:block`) therefore leaves it collapsed, header included.
  expect(container.querySelector("[data-nav-item]")).toBeNull();
  expect(screen.queryByText("Inspector")).toBeNull();
  expect(screen.queryByText("Logs")).toBeNull();
  const groupEl = container.querySelector("[data-nav-group]");
  expect(groupEl?.className).toContain("hidden");
  expect(groupEl?.className).toContain("has-[[data-nav-item]]:block");
});

test("shows the group (header + visible items) when at least one item is visible", () => {
  const { container } = renderSidebar([
    {
      id: "dev",
      label: "Dev Tools",
      items: [
        { id: "x", label: "Inspector", to: "/x", useVisible: () => true },
        { id: "y", label: "Logs", to: "/y", useVisible: () => false },
      ],
    },
  ]);
  expect(screen.getByText("Dev Tools")).toBeTruthy();
  expect(screen.getByText("Inspector")).toBeTruthy();
  expect(screen.queryByText("Logs")).toBeNull();
  // One visible item carries [data-nav-item], so the CSS `:has()` rule un-hides the group.
  expect(container.querySelector("[data-nav-item]")).not.toBeNull();
});

test("adding a useVisible item to an existing group at runtime does not break hook order", () => {
  const base: NavGroup[] = [
    { id: "main", label: "Main", items: [{ id: "a", label: "Alpha", to: "/a" }] },
  ];
  const { rerender } = render(
    <MemoryRouter>
      <Sidebar groups={base} collapsed={false} width={200} onResize={() => {}} />
    </MemoryRouter>,
  );
  expect(screen.getByText("Alpha")).toBeTruthy();

  // Add a second item to the SAME group id, carrying a useVisible hook. With per-item
  // fibers this mounts a fresh fiber (safe). The old parent-side filter would have
  // changed NavGroupView's own hook count and thrown "rendered more hooks than before".
  const extended: NavGroup[] = [
    {
      id: "main",
      label: "Main",
      items: [
        { id: "a", label: "Alpha", to: "/a" },
        { id: "b", label: "Beta", to: "/b", useVisible: () => true },
      ],
    },
  ];
  rerender(
    <MemoryRouter>
      <Sidebar groups={extended} collapsed={false} width={200} onResize={() => {}} />
    </MemoryRouter>,
  );
  expect(screen.getByText("Alpha")).toBeTruthy();
  expect(screen.getByText("Beta")).toBeTruthy();
});

const StarIcon = ({ className }: { size?: number; className?: string }) => (
  <svg data-testid="icon-star" className={className} />
);
const BoltIcon = ({ className }: { size?: number; className?: string }) => (
  <svg data-testid="icon-bolt" className={className} />
);

test("uses useLabel over the static label", () => {
  renderSidebar([
    { id: "main", items: [{ id: "a", label: "Static", to: "/a", useLabel: () => "Dynamic" }] },
  ]);
  expect(screen.getByText("Dynamic")).toBeTruthy();
  expect(screen.queryByText("Static")).toBeNull();
});

test("uses useIcon over the static icon", () => {
  const { container } = renderSidebar([
    { id: "main", items: [{ id: "a", label: "Alpha", to: "/a", icon: StarIcon, useIcon: () => BoltIcon }] },
  ]);
  expect(container.querySelector("[data-testid=icon-bolt]")).not.toBeNull();
  expect(container.querySelector("[data-testid=icon-star]")).toBeNull();
});

test("re-renders the label live when its backing useSetting changes", () => {
  const groups: NavGroup[] = [
    {
      id: "main",
      items: [{ id: "a", label: "Off", to: "/a", useLabel: () => (useSetting("on", false)[0] ? "On" : "Off") }],
    },
  ];
  function Toggle() {
    const [on, setOn] = useSetting("on", false);
    return (
      <button type="button" onClick={() => setOn(!on)}>
        toggle
      </button>
    );
  }
  render(
    <PersistentStoreProvider storage={memoryStorage()}>
      <MemoryRouter>
        <Toggle />
        <Sidebar groups={groups} collapsed={false} width={200} onResize={() => {}} />
      </MemoryRouter>
    </PersistentStoreProvider>,
  );
  expect(screen.getByText("Off")).toBeTruthy();
  fireEvent.click(screen.getByText("toggle"));
  expect(screen.getByText("On")).toBeTruthy();
});

test("re-renders a badge live when its backing useSetting changes", () => {
  const groups: NavGroup[] = [
    { id: "main", items: [{ id: "a", label: "Alpha", to: "/a", badge: () => <span>{useSetting("count", 0)[0]}</span> }] },
  ];
  function Bump() {
    const [n, setN] = useSetting("count", 0);
    return (
      <button type="button" onClick={() => setN(n + 1)}>
        bump
      </button>
    );
  }
  render(
    <PersistentStoreProvider storage={memoryStorage()}>
      <MemoryRouter>
        <Bump />
        <Sidebar groups={groups} collapsed={false} width={200} onResize={() => {}} />
      </MemoryRouter>
    </PersistentStoreProvider>,
  );
  expect(screen.getByText("0")).toBeTruthy();
  fireEvent.click(screen.getByText("bump"));
  expect(screen.getByText("1")).toBeTruthy();
});

test("flips an item live when its backing useSetting flag changes", () => {
  const groups: NavGroup[] = [
    {
      id: "dev",
      label: "Dev Tools",
      items: [
        {
          id: "inspector",
          label: "Inspector",
          to: "/inspector",
          useVisible: () => useSetting("devMode", false)[0],
        },
      ],
    },
  ];

  function Toggle() {
    const [on, setOn] = useSetting("devMode", false);
    return (
      <button type="button" onClick={() => setOn(!on)}>
        toggle
      </button>
    );
  }

  render(
    <PersistentStoreProvider storage={memoryStorage()}>
      <MemoryRouter>
        <Toggle />
        <Sidebar groups={groups} collapsed={false} width={200} onResize={() => {}} />
      </MemoryRouter>
    </PersistentStoreProvider>,
  );

  // Hidden initially (devMode defaults to false).
  expect(screen.queryByText("Inspector")).toBeNull();

  // Turn dev mode on: the sidebar's useSetting subscription re-renders NavGroupView.
  fireEvent.click(screen.getByText("toggle"));
  expect(screen.getByText("Inspector")).toBeTruthy();

  // Turn it back off: the item disappears again.
  fireEvent.click(screen.getByText("toggle"));
  expect(screen.queryByText("Inspector")).toBeNull();
});
