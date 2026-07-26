import type { NavGroup } from "@picoframe/plugin-sdk";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { cn } from "../lib/cn";
import { SidebarNav } from "./Sidebar";

/**
 * Sidebar-as-popover: a panel anchored beneath the top bar's menu button. Must be rendered
 * inside a `position: relative` wrapper around the trigger so `top-full` drops it directly
 * under the button. A transparent full-screen catcher (no dimming scrim) closes it on an
 * outside click. Escape and route changes also close it.
 *
 * `fullscreen` swaps the anchored card for a panel filling everything below the top bar,
 * which is how the narrow-window mode presents the nav. Only the positioning and enter
 * transition change; every close path stays the same.
 */
export function SidebarPopover({
  groups,
  open,
  onClose,
  fullscreen = false,
}: {
  groups: NavGroup[];
  open: boolean;
  onClose: () => void;
  /** Fill the viewport below the top bar instead of anchoring under the menu button. */
  fullscreen?: boolean;
}) {
  const { pathname } = useLocation();
  const prevPath = useRef(pathname);
  // Enter transition: mount at scale-95/opacity-0, then flip on the next frame so the panel
  // animates in rather than snapping. Reset whenever it closes.
  const [entered, setEntered] = useState(false);

  // Close when the route actually changes. Seeding the ref with the current path means
  // mounting (prev === current) never fires a spurious close.
  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default"
      />
      <div
        data-slot="sidebar-popover"
        data-fullscreen={fullscreen || undefined}
        className={cn(
          "z-50 flex flex-col overflow-hidden border-sidebar-border bg-sidebar",
          "transition duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none",
          // `top-12` matches the top bar's `h-12`, so the panel starts flush under it and the
          // menu button (and the Tauri drag region) stay reachable.
          fullscreen && "fixed inset-x-0 bottom-0 top-12 border-t",
          fullscreen && (entered ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"),
          !fullscreen &&
            "absolute left-0 top-full mt-1 max-h-[calc(100vh-4rem)] w-64 origin-top-left rounded-lg border shadow-lg",
          !fullscreen && (entered ? "scale-100 opacity-100" : "scale-95 opacity-0"),
        )}
      >
        <SidebarNav groups={groups} collapsed={false} />
      </div>
    </>
  );
}
