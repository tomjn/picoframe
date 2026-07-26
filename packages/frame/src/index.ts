export { AppFrame, type AppFrameProps } from "./AppFrame";
export type { HomeOverride } from "./home";
export { framePlugin } from "./framePlugin";
export { useFrame } from "./context/frame";
export { ThemeProvider, useTheme, type ThemeMode, type Accent, type Base } from "./context/theme";
export type { Configurable, LayoutConfig } from "./context/layoutConfig";
export { useNavigationStack } from "./history/navigation-stack";
export { useSidebarState, SIDEBAR_COLLAPSED_KEY, type SidebarState } from "./layout/useSidebarState";
export { useHideSidebar } from "./layout/hideSidebar";
export { Slot } from "./slots/slots";
export { NavGate } from "./nav/NavGate";
export { cn } from "./lib/cn";

// The ONLY UI components exported from @picoframe/frame: token-driven primitives that
// npm-published plugins must be able to import (plugins can't use a consumer app's
// copied-in shadcn files). EVERY other component (select, checkbox, textarea, form, …)
// is a shadcn source-registry item in packages/registry, consumed via
// `npx shadcn add @picoframe/<name>` — it is NOT and will not be exported here.
// See AGENTS.md ("Two @picoframe/ channels").
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Input } from "./components/input";

// Toasts + sidecar progress: a frame-owned toast surface (mounted automatically by the frame
// layout) and a hook that drives a self-updating toast from a sidecar's progress event
// stream. `toast` is re-exported from sonner so plugins can raise toasts without depending on
// sonner directly (they can only import from `@picoframe/frame`).
export { Toaster } from "./toast/Toaster";
export { useSidecarProgress, type SidecarProgressOptions } from "./toast/useSidecarProgress";
export { toast } from "sonner";

// Side/bottom drawer: open a single, frame-managed drawer from anywhere. Portals into
// `document.body` by default, or a caller-supplied `container` (side sheet or bottom sheet).
export {
  useDrawer,
  type DrawerController,
  type DrawerOptions,
  type DrawerContainer,
  type DrawerDirection,
  type DrawerSize,
} from "./drawer/DrawerProvider";

// Persistence: read/write persisted values, and supply a custom storage backend.
// `useSetting` is the settings-flavoured alias of `usePersistentValue`.
export {
  usePersistentValue,
  useSetting,
  PersistentStoreProvider,
} from "./settings/SettingsStoreProvider";
export {
  localStorageAdapter,
  memoryStorage,
  type PersistentStorage,
  type SettingsStorage,
} from "./settings/storage";
export { FRAME_APPEARANCE_SETTINGS_ID } from "./settings/settingsPlugin";
export { useSettingsBadge, type SettingsBadge } from "./settings/SettingsBadge";

// Re-export the plugin authoring contract so consumers import from one place.
export type {
  FramePlugin,
  NavGroup,
  NavItem,
  FrameRoute,
  CrumbContext,
  CrumbFn,
  SlotId,
  SlotContribution,
  SettingsSection,
  IconComponent,
} from "@picoframe/plugin-sdk";
export { defineCommand, type CliResult } from "@picoframe/plugin-sdk";
