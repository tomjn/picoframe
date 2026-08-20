import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { Drawer } from "./Drawer";
import { DrawerHost } from "./DrawerHost";
import { DrawerProvider, useDrawer } from "./DrawerProvider";

afterEach(cleanup);

test("a controlled drawer renders its children while open", () => {
  render(
    <Drawer open onOpenChange={() => {}} title="Details">
      <p>panel body</p>
    </Drawer>,
  );
  expect(screen.getByText("panel body")).toBeTruthy();
  expect(screen.getByText("Details")).toBeTruthy();
});

test("a controlled drawer renders nothing while closed", () => {
  render(
    <Drawer open={false} onOpenChange={() => {}}>
      <p>panel body</p>
    </Drawer>,
  );
  expect(screen.queryByText("panel body")).toBeNull();
});

test("children re-render in place while the drawer stays open", () => {
  const { rerender } = render(
    <Drawer open onOpenChange={() => {}}>
      <p>loading</p>
    </Drawer>,
  );
  expect(screen.getByText("loading")).toBeTruthy();
  // The point of the controlled form: content follows the caller's state without
  // the caller re-invoking open() to swap a snapshot of the content.
  rerender(
    <Drawer open onOpenChange={() => {}}>
      <p>loaded</p>
    </Drawer>,
  );
  expect(screen.getByText("loaded")).toBeTruthy();
  expect(screen.queryByText("loading")).toBeNull();
});

test("DrawerProvider and DrawerHost drive the imperative drawer outside AppFrame", () => {
  function Opener() {
    const { open } = useDrawer();
    useEffect(() => open({ content: <p>imperative body</p>, title: "Imperative" }), [open]);
    return null;
  }
  render(
    <DrawerProvider>
      <Opener />
      <DrawerHost />
    </DrawerProvider>,
  );
  expect(screen.getByText("imperative body")).toBeTruthy();
});
