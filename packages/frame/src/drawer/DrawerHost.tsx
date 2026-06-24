"use client";

import { Dialog } from "radix-ui";
import { cn } from "../lib/cn";
import { useDrawerHost } from "./DrawerProvider";

/**
 * Renders the single shared side drawer. Built on Radix Dialog for backdrop, focus trap,
 * escape-to-close and scroll lock; styled to slide in from the chosen side. Mounted once
 * inside the frame layout.
 */
export function DrawerHost() {
  const { isOpen, options, close } = useDrawerHost();
  const side = options?.side ?? "right";
  const width = options?.width ?? "24rem";

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-[pf-fade-out_200ms_ease-in] data-[state=open]:animate-[pf-fade-in_200ms_ease-out]" />
        <Dialog.Content
          style={{ width }}
          className={cn(
            "fixed inset-y-0 z-50 flex max-w-[90vw] flex-col gap-4 bg-background p-6 text-foreground shadow-lg outline-none",
            side === "right"
              ? "right-0 border-l border-border data-[state=closed]:animate-[pf-drawer-out-right_200ms_ease-in] data-[state=open]:animate-[pf-drawer-in-right_300ms_ease-out]"
              : "left-0 border-r border-border data-[state=closed]:animate-[pf-drawer-out-left_200ms_ease-in] data-[state=open]:animate-[pf-drawer-in-left_300ms_ease-out]",
          )}
        >
          <Dialog.Title className={cn("text-lg font-semibold", !options?.title && "sr-only")}>
            {options?.title ?? "Drawer"}
          </Dialog.Title>
          <Dialog.Description
            className={cn("text-sm text-muted-foreground", !options?.description && "sr-only")}
          >
            {options?.description ?? "Side drawer"}
          </Dialog.Description>
          <div className="min-h-0 flex-1 overflow-auto">{options?.content}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
