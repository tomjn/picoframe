import type { FramePlugin } from "@picoframe/plugin-sdk";
import { House } from "lucide-react";

/**
 * The built-in base plugin. Include it first in your app's plugin list. It
 * provides the index route (`/`) and a "Home" nav item so every app has a
 * sensible landing page out of the box.
 */
export const framePlugin: FramePlugin = {
  id: "frame",
  version: "0.0.0",
  nav: [
    {
      id: "main",
      order: 0,
      items: [{ id: "frame.home", label: "Home", to: "/", end: true, order: 0, icon: House }],
    },
  ],
  routes: [{ index: true, lazy: () => import("./pages/Home"), crumb: "Home" }],
};
