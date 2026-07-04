import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import type { FramePlugin, SettingsSection } from "@picoframe/plugin-sdk";
import { FrameProvider, type FrameContextValue } from "../context/frame";
import { PersistentStoreProvider, useSetting } from "../settings/SettingsStoreProvider";
import { memoryStorage } from "../settings/storage";
import { type ComposedSettings, composeSettings } from "../settings/composeSettings";
import Settings from "./Settings";

afterEach(cleanup);

function compose(sections: SettingsSection[]): ComposedSettings {
  const plugin: FramePlugin = { id: "p", version: "0", routes: [], settings: sections };
  return composeSettings([plugin]);
}

function renderAt(settings: ComposedSettings, sectionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/settings/${sectionId}`]}>
      <FrameProvider value={{ settings } as unknown as FrameContextValue}>
        <Routes>
          <Route path="/settings/:sectionId" element={<Settings />} />
        </Routes>
      </FrameProvider>
    </MemoryRouter>,
  );
}

test("hides a top-level section whose useVisible returns false from the tree", () => {
  const settings = compose([
    { id: "home", title: "Home", Component: () => <div>HOME PANEL</div> },
    { id: "vis", title: "Visible Section" },
    { id: "hid", title: "Hidden Section", useVisible: () => false },
  ]);
  renderAt(settings, "home");
  expect(screen.getByText("Visible Section")).toBeTruthy();
  expect(screen.queryByText("Hidden Section")).toBeNull();
});

test("flips a section's tree presence live when its backing useSetting changes", () => {
  const settings = compose([
    { id: "home", title: "Home", Component: () => <div>HOME</div> },
    { id: "dev", title: "Dev Section", useVisible: () => useSetting("devMode", false)[0] },
  ]);
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
      <MemoryRouter initialEntries={["/settings/home"]}>
        <FrameProvider value={{ settings } as unknown as FrameContextValue}>
          <Toggle />
          <Routes>
            <Route path="/settings/:sectionId" element={<Settings />} />
          </Routes>
        </FrameProvider>
      </MemoryRouter>
    </PersistentStoreProvider>,
  );
  expect(screen.queryByText("Dev Section")).toBeNull();
  fireEvent.click(screen.getByText("toggle"));
  expect(screen.getByText("Dev Section")).toBeTruthy();
  fireEvent.click(screen.getByText("toggle"));
  expect(screen.queryByText("Dev Section")).toBeNull();
});
