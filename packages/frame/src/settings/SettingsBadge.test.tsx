import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { type SettingsBadge, SettingsBadgeProvider, useSettingsBadge } from "./SettingsBadge";
import { settingsPlugin } from "./settingsPlugin";

afterEach(cleanup);

/** The frame's Settings footer-link slot component, from the built-in settings plugin. */
const FooterLink = settingsPlugin().slots?.find((s) => s.slot === "sidebar.footer")?.Component;

function Setter({ to }: { to: SettingsBadge }) {
  const { setBadge } = useSettingsBadge();
  return (
    <button type="button" onClick={() => setBadge(to)}>
      set
    </button>
  );
}

function renderFooter(setter?: SettingsBadge) {
  if (!FooterLink) throw new Error("footer slot component not found");
  return render(
    <MemoryRouter>
      <SettingsBadgeProvider>
        {setter !== undefined && <Setter to={setter} />}
        <FooterLink />
      </SettingsBadgeProvider>
    </MemoryRouter>,
  );
}

test("no badge by default", () => {
  const { container } = renderFooter();
  expect(container.querySelector("[data-settings-badge]")).toBeNull();
});

test("true renders an attention dot", () => {
  const { container } = renderFooter(true);
  fireEvent.click(screen.getByText("set"));
  expect(container.querySelector("[data-settings-badge=dot]")).not.toBeNull();
});

test("a number renders a count bubble", () => {
  const { container } = renderFooter(3);
  fireEvent.click(screen.getByText("set"));
  const bubble = container.querySelector("[data-settings-badge=count]");
  expect(bubble).not.toBeNull();
  expect(bubble?.textContent).toBe("3");
});

test("setting false clears a shown badge live", () => {
  if (!FooterLink) throw new Error("footer slot component not found");
  function Toggle() {
    const { setBadge } = useSettingsBadge();
    return (
      <>
        <button type="button" onClick={() => setBadge(true)}>
          show
        </button>
        <button type="button" onClick={() => setBadge(false)}>
          hide
        </button>
      </>
    );
  }
  const { container } = render(
    <MemoryRouter>
      <SettingsBadgeProvider>
        <Toggle />
        <FooterLink />
      </SettingsBadgeProvider>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText("show"));
  expect(container.querySelector("[data-settings-badge]")).not.toBeNull();
  fireEvent.click(screen.getByText("hide"));
  expect(container.querySelector("[data-settings-badge]")).toBeNull();
});

test("useSettingsBadge throws outside the provider", () => {
  function Bare() {
    useSettingsBadge();
    return null;
  }
  expect(() => render(<Bare />)).toThrow("useSettingsBadge must be used within <AppFrame>");
});
