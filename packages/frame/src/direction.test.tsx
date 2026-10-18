import { afterEach, beforeEach, expect, test } from "bun:test";
import type { FramePlugin } from "@picoframe/plugin-sdk";
import { cleanup, render, screen } from "@testing-library/react";
import { DropdownMenu } from "radix-ui";
import { AppFrame } from "./AppFrame";

function openAt(hash: string) {
  (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(`http://localhost/#${hash}`);
}

// An open Radix menu in the top bar: Radix writes the direction it was given onto the menu.
function OpenMenu() {
  return (
    <DropdownMenu.Root open>
      <DropdownMenu.Trigger>menu</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item>item</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const menuPlugin: FramePlugin = {
  id: "menu",
  version: "0.0.0",
  routes: [],
  slots: [{ slot: "topbar.right", Component: OpenMenu }],
};

beforeEach(() => {
  Object.assign(window, {
    __TAURI_INTERNALS__: {
      transformCallback: () => 1,
      unregisterCallback: () => {},
      invoke: async () => 1,
    },
    __TAURI_EVENT_PLUGIN_INTERNALS__: { unregisterListener: () => {} },
  });
  openAt("/");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute("dir");
});

test("dir=rtl puts the sidebar border on the end side and gives Radix menus an rtl direction", async () => {
  render(<AppFrame plugins={[menuPlugin]} dir="rtl" />);
  const menu = await screen.findByRole("menu");
  expect(menu.getAttribute("dir")).toBe("rtl");
  const sidebar = document.querySelector('[data-slot="sidebar"]') as HTMLElement;
  expect(sidebar.className).toContain("border-e");
  expect(sidebar.className).not.toContain("border-r");
  expect(sidebar.closest("[dir]")?.getAttribute("dir")).toBe("rtl");
});

test("dir=ltr gives Radix menus an ltr direction", async () => {
  render(<AppFrame plugins={[menuPlugin]} dir="ltr" />);
  expect((await screen.findByRole("menu")).getAttribute("dir")).toBe("ltr");
});

test("with no dir prop the frame follows document.documentElement.dir", async () => {
  document.documentElement.dir = "rtl";
  render(<AppFrame plugins={[menuPlugin]} />);
  expect((await screen.findByRole("menu")).getAttribute("dir")).toBe("rtl");
});

test("with no dir prop and no document direction the frame is ltr", async () => {
  render(<AppFrame plugins={[menuPlugin]} />);
  expect((await screen.findByRole("menu")).getAttribute("dir")).toBe("ltr");
});

test("an explicit dir prop wins over the document direction", async () => {
  document.documentElement.dir = "rtl";
  render(<AppFrame plugins={[menuPlugin]} dir="ltr" />);
  expect((await screen.findByRole("menu")).getAttribute("dir")).toBe("ltr");
});

test("a drawer carries the frame direction, since it portals out of the frame root", async () => {
  const { Drawer } = await import("./drawer/Drawer");
  const { Direction } = await import("radix-ui");
  render(
    <Direction.DirectionProvider dir="rtl">
      <Drawer open onOpenChange={() => {}}>
        <p>body</p>
      </Drawer>
    </Direction.DirectionProvider>,
  );
  expect((await screen.findByRole("dialog")).getAttribute("dir")).toBe("rtl");
});
