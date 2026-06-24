import type { FramePlugin } from "@picoframe/plugin-sdk";
import { Settings as SettingsIcon } from "lucide-react";
import { NavLink } from "react-router";
import { cn } from "../lib/cn";

function SettingsFooterLink() {
  return (
    <NavLink
      to="/settings"
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors group-data-[collapsed]/sidebar:justify-center",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
        )
      }
    >
      <SettingsIcon size={18} className="shrink-0" />
      <span className="truncate group-data-[collapsed]/sidebar:hidden">Settings</span>
    </NavLink>
  );
}

/**
 * Built-in plugin contributing the frame-owned `/settings` route (+ deep-link
 * `/settings/:sectionId`) and a sidebar-footer link. `AppFrame` injects it only when at
 * least one settings section is registered.
 */
export function settingsPlugin(): FramePlugin {
  return {
    id: "frame.settings",
    version: "0.0.0",
    routes: [
      { path: "settings", lazy: () => import("../pages/Settings"), crumb: "Settings" },
      { path: "settings/:sectionId", lazy: () => import("../pages/Settings") },
    ],
    slots: [{ slot: "sidebar.footer", order: 100, Component: SettingsFooterLink }],
  };
}
