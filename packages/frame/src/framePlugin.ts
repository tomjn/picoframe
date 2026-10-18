import type { FramePlugin } from "@picoframe/plugin-sdk";
import { House } from "lucide-react";
import { defaultStrings } from "./strings/defaultStrings";

/** The built-in base plugin with `label` as the Home nav item and breadcrumb. */
export function createFramePlugin(label: string): FramePlugin {
  return {
    id: "frame",
    version: "0.0.0",
    nav: [
      {
        id: "main",
        order: 0,
        items: [{ id: "frame.home", label, to: "/", end: true, order: 0, icon: House }],
      },
    ],
    routes: [{ index: true, lazy: () => import("./pages/Home"), crumb: label }],
  };
}

/**
 * The built-in base plugin. Include it first in your app's plugin list. It
 * provides the index route (`/`) and a "Home" nav item so every app has a
 * sensible landing page out of the box.
 */
export const framePlugin: FramePlugin = createFramePlugin(defaultStrings.home);
