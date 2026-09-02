"use client";

import { Dialog } from "radix-ui";
import { type ReactNode, useRef } from "react";
import { cn } from "../lib/cn";
import { drawerStyle } from "./drawerStyles";
import type { DrawerDirection, DrawerFocusOptions, DrawerSize } from "./reducer";

export interface DrawerSurfaceProps extends DrawerFocusOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Already-resolved portal target, or `null` for `document.body`. */
  target: HTMLElement | null;
  direction?: DrawerDirection;
  size?: DrawerSize;
  title?: string;
  description?: string;
  /** Explicit CSS width for side sheets. Overrides `size`. */
  width?: string;
  /** Explicit CSS height for the bottom sheet. Overrides `size`. */
  height?: string;
  children?: ReactNode;
}

/**
 * The drawer's presentation, with no opinion about where `open` comes from. Built on
 * Radix Dialog for backdrop, focus trap, escape-to-close and scroll lock, styled to
 * slide in from the chosen edge.
 *
 * With a `target` the drawer portals into that element and switches to `absolute`
 * positioning + a non-modal dialog, so the overlay is scoped to the container
 * (respecting its rounded corners) and the rest of the app, the sidebar included,
 * stays interactive. With no target it is full-window and modal.
 *
 * Two callers share it: `DrawerHost` drives it from the provider's single global
 * state, and `Drawer` drives it from its own props.
 */
export function DrawerSurface({
  open,
  onOpenChange,
  target,
  direction = "right",
  size = "md",
  title,
  description,
  width,
  height,
  onOpenAutoFocus,
  onCloseAutoFocus,
  children,
}: DrawerSurfaceProps) {
  // Radix restores focus by focusing its `Dialog.Trigger`, and this drawer is driven by an
  // `open` prop rather than a trigger, so on its own it drops focus on the floor when the
  // drawer closes. Remember what had focus on the way in and hand it back on the way out.
  const openerRef = useRef<HTMLElement | null>(null);

  const handleOpenAutoFocus = (event: Event) => {
    // Fires before Radix moves focus into the panel, so this is still the opener.
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement ? active : null;
    onOpenAutoFocus?.(event);
  };

  const handleCloseAutoFocus = (event: Event) => {
    onCloseAutoFocus?.(event);
    const opener = openerRef.current;
    // Only step in if the panel took focus down with it. Focus somewhere else means the
    // caller placed it there, or the user moved on out of a non-modal drawer.
    const focusLost = document.activeElement === null || document.activeElement === document.body;
    if (event.defaultPrevented || !focusLost || !opener?.isConnected) return;
    event.preventDefault();
    opener.focus();
  };

  const contained = target !== null;
  const { contentClass, sizeStyle } = drawerStyle(direction, size, contained);
  // Explicit width/height override the named size for the relevant axis.
  const style =
    direction === "bottom"
      ? { ...sizeStyle, ...(height ? { height } : {}) }
      : { ...sizeStyle, ...(width ? { width } : {}) };

  return (
    <Dialog.Root
      open={open}
      // Non-modal when contained so pointer events reach the rest of the app, modal
      // (scroll lock + focus trap) for the default full-window drawer.
      modal={!contained}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal container={target}>
        <Dialog.Overlay
          className={cn(
            contained ? "absolute" : "fixed",
            "inset-0 z-50 bg-black/50 data-[state=closed]:animate-[pf-fade-out_200ms_ease-in] data-[state=open]:animate-[pf-fade-in_200ms_ease-out]",
          )}
        />
        <Dialog.Content
          style={style}
          // A caller's handler runs first and can `preventDefault()` to take focus over on
          // the way in or out, rather than timing a focus call against the exit animation.
          onOpenAutoFocus={handleOpenAutoFocus}
          onCloseAutoFocus={handleCloseAutoFocus}
          className={cn(
            "z-50 flex flex-col gap-4 bg-background p-6 text-foreground shadow-lg outline-none",
            contentClass,
          )}
        >
          <Dialog.Title className={cn("text-lg font-semibold", !title && "sr-only")}>
            {title ?? "Drawer"}
          </Dialog.Title>
          <Dialog.Description className={cn("text-sm text-muted-foreground", !description && "sr-only")}>
            {description ?? "Drawer"}
          </Dialog.Description>
          {/* `-m-1 p-1`: give the scroll viewport ~4px of interior room so focus
              rings (box-shadows extend past the control box) aren't clipped at the
              edges, without shifting the content's apparent position. */}
          <div className="-m-1 min-h-0 flex-1 overflow-auto p-1">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
