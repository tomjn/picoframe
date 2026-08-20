"use client";

import { useDrawerHost } from "./DrawerProvider";
import { DrawerSurface } from "./DrawerSurface";
import { resolveContainer } from "./drawerStyles";

/**
 * Renders the single shared drawer from the provider's state. Mounted once inside the
 * frame layout, and exported so a drawer host can be mounted outside `AppFrame` (a
 * secondary window, or an app adopting the frame a piece at a time). Pair it with one
 * `DrawerProvider` above it, then open from anywhere under that provider with
 * `useDrawer()`.
 */
export function DrawerHost() {
  const { isOpen, options, container, close } = useDrawerHost();

  return (
    <DrawerSurface
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      target={resolveContainer(options?.container, container)}
      direction={options?.direction ?? options?.side}
      size={options?.size}
      title={options?.title}
      description={options?.description}
      width={options?.width}
      height={options?.height}
    >
      {options?.content}
    </DrawerSurface>
  );
}
