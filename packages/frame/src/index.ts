export { AppFrame, type AppFrameProps } from "./AppFrame";
export { framePlugin } from "./framePlugin";
export { useFrame } from "./context/frame";
export { ThemeProvider, useTheme, type ThemeMode } from "./context/theme";
export { useNavigationStack } from "./history/navigation-stack";
export { Slot } from "./slots/slots";
export { cn } from "./lib/cn";

// Re-export the plugin authoring contract so consumers import from one place.
export type {
  FramePlugin,
  NavGroup,
  NavItem,
  FrameRoute,
  SlotId,
  SlotContribution,
  IconComponent,
} from "@picoframe/plugin-sdk";
export { defineCommand, type CliResult } from "@picoframe/plugin-sdk";
