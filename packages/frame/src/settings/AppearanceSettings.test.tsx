import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LayoutConfigProvider, type LayoutConfig } from "../context/layoutConfig";
import { ThemeProvider } from "../context/theme";
import { AppearanceSettings } from "./AppearanceSettings";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderSettings(config?: LayoutConfig) {
  return render(
    <ThemeProvider>
      <LayoutConfigProvider config={config}>
        <AppearanceSettings />
      </LayoutConfigProvider>
    </ThemeProvider>,
  );
}

test("renders no layout toggle for a locked option", () => {
  renderSettings({ sidebar: { popover: true } });
  expect(screen.queryByRole("switch", { name: "Sidebar as popover menu" })).toBeNull();
});

test("renders a switch for an exposed option and flips it on click", () => {
  renderSettings({ sidebar: { popover: { default: false } } });
  const sw = screen.getByRole("switch", { name: "Sidebar as popover menu" });
  expect(sw.getAttribute("aria-checked")).toBe("false");
  fireEvent.click(sw);
  expect(sw.getAttribute("aria-checked")).toBe("true");
});

test("seeds the switch from the exposed default", () => {
  renderSettings({ breadcrumb: { collapsed: { default: true } } });
  const sw = screen.getByRole("switch", { name: "Collapse breadcrumb" });
  expect(sw.getAttribute("aria-checked")).toBe("true");
});
