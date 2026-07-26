import { type ReactNode, createContext, useContext, useLayoutEffect } from "react";

/** How a mounted page registers its wish to hide the sidebar. Call the result to withdraw it. */
export interface HideSidebarRegistry {
  register: () => () => void;
}

const HideSidebarContext = createContext<HideSidebarRegistry | null>(null);

export function HideSidebarProvider({
  value,
  children,
}: {
  value: HideSidebarRegistry;
  children: ReactNode;
}) {
  return <HideSidebarContext.Provider value={value}>{children}</HideSidebarContext.Provider>;
}

/**
 * Hide the docked sidebar for as long as the calling component is mounted, for pages that
 * want the full width (a focus editor, a wizard, a canvas).
 *
 * The nav is never lost: the frame falls back to its `popover` presentation, so the top bar's
 * menu button still opens the full nav as an overlay. The persisted collapse state and width
 * are left alone, so leaving the page restores the rail exactly as the user had it.
 *
 * Pass a boolean to make it conditional on page state, e.g. `useHideSidebar(zenMode)`.
 * Requests from several mounted components compose: the sidebar comes back when the last
 * one unmounts or turns its request off.
 */
export function useHideSidebar(hidden = true) {
  const registry = useContext(HideSidebarContext);
  if (!registry) throw new Error("useHideSidebar must be used within <AppFrame>");
  // Layout effect, not effect: registering before paint stops the rail flashing into view
  // for a frame on a page that hides it from the start.
  useLayoutEffect(() => {
    if (!hidden) return;
    return registry.register();
  }, [hidden, registry]);
}
