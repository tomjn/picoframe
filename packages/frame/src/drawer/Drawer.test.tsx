import { afterEach, expect, mock, test } from "bun:test";
import { act, cleanup, render, screen } from "@testing-library/react";
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

function FocusHarness({ open, onCloseAutoFocus }: { open: boolean; onCloseAutoFocus?: (event: Event) => void }) {
  return (
    <>
      <button type="button" data-testid="trigger">
        open
      </button>
      <button type="button" data-testid="destination">
        destination
      </button>
      <Drawer open={open} onOpenChange={() => {}} onCloseAutoFocus={onCloseAutoFocus}>
        <p>panel body</p>
      </Drawer>
    </>
  );
}

/** Radix moves focus in a task after the content unmounts, so tests have to wait one out. */
const settleFocus = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

test("a closing drawer restores focus to whatever opened it", async () => {
  const { rerender } = render(<FocusHarness open={false} />);
  const trigger = screen.getByTestId("trigger");
  trigger.focus();
  rerender(<FocusHarness open />);
  await settleFocus();
  rerender(<FocusHarness open={false} />);
  await settleFocus();
  expect(document.activeElement).toBe(trigger);
});

test("a closing drawer leaves focus alone when it is already somewhere else", async () => {
  // A contained drawer is non-modal, so the user can move focus out of it and close it
  // from there. Dragging focus back to the opener would undo their move.
  const container = document.createElement("div");
  document.body.appendChild(container);
  const contained = (open: boolean) => (
    <>
      <button type="button" data-testid="trigger">
        open
      </button>
      <button type="button" data-testid="destination">
        destination
      </button>
      <Drawer open={open} onOpenChange={() => {}} container={container}>
        <p>panel body</p>
      </Drawer>
    </>
  );
  const { rerender } = render(contained(false));
  screen.getByTestId("trigger").focus();
  rerender(contained(true));
  await settleFocus();
  const destination = screen.getByTestId("destination");
  destination.focus();
  rerender(contained(false));
  await settleFocus();
  expect(document.activeElement).toBe(destination);
  container.remove();
});

test("onCloseAutoFocus lets the caller place focus itself", async () => {
  const destination = () => screen.getByTestId("destination");
  const takeFocus = (event: Event) => {
    // The point of the hook: prevent Radix's restore, then focus somewhere else,
    // with no need to know how long the exit animation runs.
    event.preventDefault();
    destination().focus();
  };
  const { rerender } = render(<FocusHarness open={false} onCloseAutoFocus={takeFocus} />);
  screen.getByTestId("trigger").focus();
  rerender(<FocusHarness open onCloseAutoFocus={takeFocus} />);
  rerender(<FocusHarness open={false} onCloseAutoFocus={takeFocus} />);
  await settleFocus();
  expect(document.activeElement).toBe(destination());
});

test("the imperative drawer forwards onCloseAutoFocus too", async () => {
  let closeDrawer = () => {};
  const onCloseAutoFocus = mock((event: Event) => event.preventDefault());
  function Opener() {
    const { open, close } = useDrawer();
    closeDrawer = close;
    useEffect(() => open({ content: <p>imperative body</p>, onCloseAutoFocus }), [open]);
    return null;
  }
  render(
    <DrawerProvider>
      <Opener />
      <DrawerHost />
    </DrawerProvider>,
  );
  act(() => closeDrawer());
  await settleFocus();
  expect(onCloseAutoFocus).toHaveBeenCalled();
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
