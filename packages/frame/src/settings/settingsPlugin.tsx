import type { FramePlugin } from "@picoframe/plugin-sdk";
import { Palette, Settings as SettingsIcon } from "lucide-react";
import { NavLink } from "react-router";
import { cn } from "../lib/cn";
import { AppearanceSettings } from "./AppearanceSettings";
import { type SettingsBadge, useSettingsBadge } from "./SettingsBadge";

/** Id of the built-in, frame-owned Appearance (theme) settings section. Declare a section
 *  with this `id` and `useVisible: () => false` from any plugin you pass to `AppFrame` to
 *  hide the theme UI (e.g. when the app forces a fixed theme). */
export const FRAME_APPEARANCE_SETTINGS_ID = "frame.appearance";

/** Render the footer-link indicator: a dot for `true`, a bubble for a count/node, else nothing. */
function BadgeIndicator({ badge }: { badge: SettingsBadge }) {
  if (badge === true) {
    return (
      <span
        data-settings-badge="dot"
        aria-hidden
        className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-sidebar"
      />
    );
  }
  if (badge === false || badge === null || badge === undefined) return null;
  return (
    <span
      data-settings-badge="count"
      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground ring-2 ring-sidebar"
    >
      {badge}
    </span>
  );
}

function SettingsFooterLink() {
  const { badge } = useSettingsBadge();
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
      <span className="relative shrink-0">
        <SettingsIcon size={18} className="shrink-0" />
        <BadgeIndicator badge={badge} />
      </span>
      <span className="truncate group-data-[collapsed]/sidebar:hidden">Settings</span>
    </NavLink>
  );
}

/**
 * Built-in plugin contributing the frame-owned `/settings` route (+ deep-link
 * `/settings/:sectionId`), a sidebar-footer link, and the always-present Appearance
 * (theme) section. `AppFrame` injects it unconditionally, so every app has a settings
 * area with at least the theme control.
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
    settings: [
      {
        id: FRAME_APPEARANCE_SETTINGS_ID,
        title: "Appearance",
        icon: Palette,
        order: 10,
        description: "Theme and visual preferences.",
        Component: AppearanceSettings,
      },
    ],
  };
}
