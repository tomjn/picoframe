import { afterEach, beforeEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppFrame } from "../AppFrame";
import { Drawer } from "../drawer/Drawer";
import { SidebarPopover } from "../layout/SidebarPopover";
import { StringsProvider, resolveStrings } from "./strings";

// The preload leaves happy-dom on about:blank, which HashRouter cannot build URLs from.
function openAt(hash: string) {
  (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(`http://localhost/#${hash}`);
}

beforeEach(() => {
  // AppFrame listens for mouse navigation events through Tauri; give it a stub to talk to.
  Object.assign(window, {
    __TAURI_INTERNALS__: {
      transformCallback: () => 1,
      unregisterCallback: () => {},
      invoke: async () => 1,
    },
    __TAURI_EVENT_PLUGIN_INTERNALS__: { unregisterListener: () => {} },
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

test("the settings page shows English when the host passes no strings table", async () => {
  openAt("/settings/frame.appearance");
  render(<AppFrame plugins={[]} />);
  expect(await screen.findByRole("heading", { name: "Appearance" })).toBeTruthy();
});

test("the settings page shows the host's translation of Appearance", async () => {
  openAt("/settings/frame.appearance");
  render(<AppFrame plugins={[]} strings={{ appearance: "Darstellung", settings: "Einstellungen" }} />);
  expect(await screen.findByRole("heading", { name: "Darstellung" })).toBeTruthy();
  expect(screen.queryByText("Appearance")).toBeNull();
  // Keys the host left out stay English.
  expect(screen.getByText("Theme")).toBeTruthy();
  // The sidebar footer link and the breadcrumb use the translated settings label.
  expect(screen.getAllByText("Einstellungen").length).toBeGreaterThan(0);
  expect(screen.queryByText("Settings")).toBeNull();
});

test("colour names are translated by colour id", async () => {
  openAt("/settings/frame.appearance");
  render(<AppFrame plugins={[]} strings={{ accentNames: { blue: "Blau" } }} />);
  expect(await screen.findByRole("radio", { name: "Blau" })).toBeTruthy();
  // The base ramp has its own map, so its Blue stays English, as do untouched accents.
  expect(screen.getAllByRole("radio", { name: "Blue" })).toHaveLength(1);
  expect(screen.getAllByRole("radio", { name: "Rose" })).toHaveLength(2);
});

test("a drawer with no title or description reads its translated fallback to screen readers", () => {
  render(
    <StringsProvider strings={{ drawer: "Schublade" }}>
      <Drawer open onOpenChange={() => {}}>
        <p>body</p>
      </Drawer>
    </StringsProvider>,
  );
  const title = screen.getAllByText("Schublade");
  expect(title).toHaveLength(2);
  expect(title.every((el) => el.className.includes("sr-only"))).toBe(true);
  expect(screen.queryByText("Drawer")).toBeNull();
});

test("a drawer with no strings table reads English", () => {
  render(
    <Drawer open onOpenChange={() => {}}>
      <p>body</p>
    </Drawer>,
  );
  expect(screen.getAllByText("Drawer")).toHaveLength(2);
});

test("resolveStrings keeps the default for an undefined value", () => {
  const resolved = resolveStrings({ appearance: undefined, accentNames: { blue: undefined, rose: "Rosa" } });
  expect(resolved.appearance).toBe("Appearance");
  expect(resolved.accentNames.blue).toBe("Blue");
  expect(resolved.accentNames.rose).toBe("Rosa");
});

test("the popover menu's close button uses the translated label", () => {
  render(
    <MemoryRouter>
      <StringsProvider strings={{ closeMenu: "Menue schliessen" }}>
        <SidebarPopover groups={[]} open onClose={() => {}} />
      </StringsProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole("button", { name: "Menue schliessen" })).toBeTruthy();
});
