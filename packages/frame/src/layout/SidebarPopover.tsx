import type { NavGroup } from "@picoframe/plugin-sdk";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { cn } from "../lib/cn";
import { SidebarNav } from "./Sidebar";

/**
 * Sidebar-as-popover: a panel anchored beneath the top bar's menu button. Must be rendered
 * inside a `position: relative` wrapper around the trigger so `top-full` drops it directly
 * under the button. A transparent full-screen catcher (no dimming scrim) closes it on an
 * outside click; Escape and route changes also close it.
 */
export function SidebarPopover({
  groups,
  open,
  onClose,
}: {
  groups: NavGroup[];
  open: boolean;
  onClose: () => void;
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
        className={cn(
          "absolute left-0 top-full z-50 mt-1 flex max-h-[calc(100vh-4rem)] w-64 origin-top-left flex-col",
          "overflow-hidden rounded-lg border border-sidebar-border bg-sidebar shadow-lg",
          "transition duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none",
          entered ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        <SidebarNav groups={groups} collapsed={false} />
      </div>
    </>
  );
}
