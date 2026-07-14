"use client";

import { Dialog } from "radix-ui";
import { cn } from "../lib/cn";
import { useDrawerHost } from "./DrawerProvider";
import { drawerStyle, resolveContainer } from "./drawerStyles";

/**
 * Renders the single shared drawer. Built on Radix Dialog for backdrop, focus trap,
 * escape-to-close and scroll lock; styled to slide in from the chosen edge. Mounted once
 * inside the frame layout.
 *
 * When a `container` is resolved the drawer portals into that element and switches to
 * `absolute` positioning + a non-modal dialog, so the overlay is scoped to the container
 * (respecting its rounded corners) and the rest of the app — e.g. the sidebar — stays
 * interactive. With no container it keeps the default full-window, modal behaviour.
 */
export function DrawerHost() {
  const { isOpen, options, container, close } = useDrawerHost();
  const direction = options?.direction ?? options?.side ?? "right";
  const size = options?.size ?? "md";
  const target = resolveContainer(options?.container, container);
  const contained = target !== null;

  const { contentClass, sizeStyle } = drawerStyle(direction, size, contained);
  // Explicit width/height override the named size for the relevant axis.
  const style =
    direction === "bottom"
      ? { ...sizeStyle, ...(options?.height ? { height: options.height } : {}) }
      : { ...sizeStyle, ...(options?.width ? { width: options.width } : {}) };

  return (
    <Dialog.Root
      open={isOpen}
      // Non-modal when contained so pointer events reach the rest of the app; modal (scroll
      // lock + focus trap) for the default full-window drawer, preserving prior behaviour.
      modal={!contained}
      onOpenChange={(next) => {
        if (!next) close();
      }}
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
          className={cn(
            "z-50 flex flex-col gap-4 bg-background p-6 text-foreground shadow-lg outline-none",
            contentClass,
          )}
        >
          <Dialog.Title className={cn("text-lg font-semibold", !options?.title && "sr-only")}>
            {options?.title ?? "Drawer"}
          </Dialog.Title>
          <Dialog.Description
            className={cn("text-sm text-muted-foreground", !options?.description && "sr-only")}
          >
            {options?.description ?? "Drawer"}
          </Dialog.Description>
          {/* `-m-1 p-1`: give the scroll viewport ~4px of interior room so focus
              rings (box-shadows extend past the control box) aren't clipped at the
              edges, without shifting the content's apparent position. */}
          <div className="-m-1 min-h-0 flex-1 overflow-auto p-1">{options?.content}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
