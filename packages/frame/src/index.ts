export { AppFrame, type AppFrameProps } from "./AppFrame";
export type { HomeOverride } from "./home";
export { framePlugin } from "./framePlugin";
export { useFrame } from "./context/frame";
export { ThemeProvider, useTheme, type ThemeMode } from "./context/theme";
export { useNavigationStack } from "./history/navigation-stack";
export { Slot } from "./slots/slots";
export { cn } from "./lib/cn";

// The ONLY UI components exported from @picoframe/frame: token-driven primitives that
// npm-published plugins must be able to import (plugins can't use a consumer app's
// copied-in shadcn files). EVERY other component (select, checkbox, textarea, form, …)
// is a shadcn source-registry item in packages/registry, consumed via
// `npx shadcn add @picoframe/<name>` — it is NOT and will not be exported here.
// See AGENTS.md ("Two @picoframe/ channels").
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Input } from "./components/input";

// Side drawer: open a single, frame-managed modal drawer from anywhere.
export { useDrawer, type DrawerController, type DrawerOptions } from "./drawer/DrawerProvider";

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
