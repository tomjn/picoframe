"use client";

import type { ReactNode } from "react";
import { DrawerSurface } from "./DrawerSurface";
import { resolveContainer } from "./drawerStyles";
import type { DrawerOptions } from "./reducer";

export interface DrawerProps extends Omit<DrawerOptions, "content"> {
  open: boolean;
  /** Called with `false` when the drawer asks to close (escape, overlay click). */
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
}

/**
 * A self-contained drawer you control with `open` / `onOpenChange`, rendering
 * `children` live.
 *
 * Use it over `useDrawer()` when the content changes while the drawer is open: async
 * loading states, an error and its retry, a multi-step form. The imperative API takes
 * a snapshot of the content at `open()` time, so following the caller's state would
 * mean re-invoking `open()` on every change.
 *
 * It owns its own dialog rather than the frame's single global one, so it does not
 * fight `useDrawer()` and several can exist at once. That also makes it the form to
 * use outside `AppFrame`, with no provider needed.
 */
export function Drawer({
  open,
  onOpenChange,
  container,
  direction,
  side,
  size,
  title,
  description,
  width,
  height,
  children,
}: DrawerProps) {
  return (
    <DrawerSurface
      open={open}
      onOpenChange={onOpenChange}
      target={resolveContainer(container, undefined)}
      direction={direction ?? side}
      size={size}
      title={title}
      description={description}
      width={width}
      height={height}
    >
      {children}
    </DrawerSurface>
  );
}
