import type { NavGroup } from "@picoframe/plugin-sdk";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { SidebarNav } from "./Sidebar";

/**
 * Sidebar-as-overlay for popover mode: a left panel + backdrop opened from the top bar's
 * menu button. Closes on backdrop click, Escape, and route change. Kept mounted while
 * closed (returns null content) so the route-change effect keeps tracking navigations.
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

  // Close when the route actually changes. Seeding the ref with the current path means
  // mounting (prev === current) never fires a spurious close.
  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <aside
        data-slot="sidebar-popover"
        className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-lg"
      >
        <SidebarNav groups={groups} collapsed={false} />
      </aside>
    </div>
  );
}
