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

test("collapses the whole group (header included) when every item is hidden", () => {
  renderSidebar([
    {
      id: "dev",
      label: "Dev Tools",
      items: [
        { id: "x", label: "Inspector", to: "/x", useVisible: () => false },
        { id: "y", label: "Logs", to: "/y", useVisible: () => false },
      ],
    },
  ]);
  expect(screen.queryByText("Dev Tools")).toBeNull();
  expect(screen.queryByText("Inspector")).toBeNull();
  expect(screen.queryByText("Logs")).toBeNull();
});

test("keeps the group header when at least one item is visible", () => {
  renderSidebar([
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
