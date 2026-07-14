import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LayoutConfigProvider, type LayoutConfig } from "../context/layoutConfig";
import { ThemeProvider, migrateLegacyAccent } from "../context/theme";
import { AppearanceSettings } from "./AppearanceSettings";

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.base;
  delete document.documentElement.dataset.accent;
  delete document.documentElement.dataset.accentAnim;
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

test("renders a switch for the exposed hover-reveal option", () => {
  renderSettings({ sidebar: { hoverReveal: { default: false } } });
  expect(screen.getByRole("switch", { name: "Hover-reveal sidebar" })).toBeTruthy();
});

test("seeds the switch from the exposed default", () => {
  renderSettings({ breadcrumb: { collapsed: { default: true } } });
  const sw = screen.getByRole("switch", { name: "Collapse breadcrumb" });
  expect(sw.getAttribute("aria-checked")).toBe("true");
});

test("selecting a base swatch sets data-base and persists it", () => {
  renderSettings();
  fireEvent.click(screen.getByRole("radio", { name: "Slate" }));
  expect(document.documentElement.dataset.base).toBe("slate");
  expect(localStorage.getItem("picoframe.base")).toBe('"slate"');
});

test("the default base (Zinc) carries no data-base attribute", () => {
  renderSettings();
  // start on a non-default base, then return to the default
  fireEvent.click(screen.getByRole("radio", { name: "Stone" }));
  expect(document.documentElement.dataset.base).toBe("stone");
  fireEvent.click(screen.getByRole("radio", { name: "Zinc" }));
  expect(document.documentElement.dataset.base).toBeUndefined();
});

test("selecting an accent applies it and fires the animation cue", () => {
  renderSettings();
  // "Blue" exists as both a base and an accent, so scope to the accent group.
  const accentGroup = screen.getByRole("radiogroup", { name: "Accent color" });
  fireEvent.click(within(accentGroup).getByRole("radio", { name: "Blue" }));
  expect(document.documentElement.dataset.accent).toBe("blue");
  // the transient cue attribute is set synchronously on selection
  expect(document.documentElement.dataset.accentAnim).toBe("");
});

test("migrateLegacyAccent rewrites a persisted 'zinc' accent to 'neutral'", () => {
  localStorage.setItem("picoframe.accent", '"zinc"');
  migrateLegacyAccent();
  expect(localStorage.getItem("picoframe.accent")).toBe('"neutral"');
});

test("migrateLegacyAccent leaves a non-legacy accent untouched", () => {
  localStorage.setItem("picoframe.accent", '"blue"');
  migrateLegacyAccent();
  expect(localStorage.getItem("picoframe.accent")).toBe('"blue"');
});
