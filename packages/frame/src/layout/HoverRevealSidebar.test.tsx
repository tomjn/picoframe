import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useNavigate } from "react-router";
import type { NavGroup } from "@picoframe/plugin-sdk";
import { HoverRevealSidebar, useHoverReveal } from "./HoverRevealSidebar";

afterEach(cleanup);

const oneItem: NavGroup[] = [{ id: "main", items: [{ id: "a", label: "Alpha", to: "/a" }] }];

/** Drives the real state machine: the "toggle" proxy shares the panel's hover handlers, exactly
 *  as the topbar toggle and the edge strip do in AppLayout. */
function Harness({ enabled = true, extra }: { enabled?: boolean; extra?: ReactNode }) {
  const reveal = useHoverReveal(enabled);
  return (
    <>
      {extra}
      <button type="button" data-testid="toggle" {...reveal.hoverHandlers}>
        toggle
      </button>
      <HoverRevealSidebar
        groups={oneItem}
        revealed={reveal.revealed}
        hoverHandlers={reveal.hoverHandlers}
        onOpen={reveal.open}
        onClose={reveal.close}
      />
    </>
  );
}

function renderHarness(props?: { enabled?: boolean; extra?: ReactNode }) {
  const utils = render(
    <MemoryRouter initialEntries={["/"]}>
      <Harness {...props} />
    </MemoryRouter>,
  );
  const panel = () => utils.container.querySelector("[data-slot=sidebar-reveal-panel]") as HTMLElement;
  const trigger = () => screen.getByLabelText("Reveal sidebar");
  return { ...utils, panel, trigger };
}

test("stays hidden (inert, translated off screen) until revealed", () => {
  const { panel } = renderHarness();
  // The nav is mounted (for the enter transition) but must not be reachable while closed.
  expect(screen.getByText("Alpha")).toBeTruthy();
  expect(panel().hasAttribute("inert")).toBe(true);
  expect(panel().className).toContain("-translate-x-full");
});

test("hovering the edge trigger reveals the panel", () => {
  const { panel, trigger } = renderHarness();
  fireEvent.mouseEnter(trigger());
  expect(panel().hasAttribute("inert")).toBe(false);
  expect(panel().className).toContain("translate-x-0");
});

test("hovering the toggle proxy also reveals (both triggers share one lifecycle)", () => {
  const { panel } = renderHarness();
  fireEvent.mouseEnter(screen.getByTestId("toggle"));
  expect(panel().hasAttribute("inert")).toBe(false);
});

test("pointer-leave dismisses after the grace period", async () => {
  const { panel } = renderHarness();
  fireEvent.mouseEnter(panel());
  expect(panel().hasAttribute("inert")).toBe(false);
  fireEvent.mouseLeave(panel());
  await waitFor(() => expect(panel().hasAttribute("inert")).toBe(true));
});

test("Escape closes the revealed panel", async () => {
  const { panel } = renderHarness();
  fireEvent.mouseEnter(panel());
  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(panel().hasAttribute("inert")).toBe(true));
});

test("Escape restores focus to the edge trigger", async () => {
  const { trigger } = renderHarness();
  fireEvent.mouseEnter(trigger());
  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(document.activeElement).toBe(trigger()));
});

test("keyboard: Enter on the edge trigger reveals the panel", () => {
  const { panel, trigger } = renderHarness();
  fireEvent.keyDown(trigger(), { key: "Enter" });
  expect(panel().hasAttribute("inert")).toBe(false);
});

test("navigating closes the panel, but mounting does not", async () => {
  function Go() {
    const navigate = useNavigate();
    return (
      <button type="button" onClick={() => navigate("/a")}>
        go
      </button>
    );
  }
  const { panel } = renderHarness({ extra: <Go /> });
  fireEvent.mouseEnter(panel());
  expect(panel().hasAttribute("inert")).toBe(false);
  fireEvent.click(screen.getByText("go"));
  await waitFor(() => expect(panel().hasAttribute("inert")).toBe(true));
});

test("disabled: hover never reveals", () => {
  const { panel, trigger } = renderHarness({ enabled: false });
  fireEvent.mouseEnter(trigger());
  expect(panel().hasAttribute("inert")).toBe(true);
});
