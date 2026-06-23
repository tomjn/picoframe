import type { FramePlugin } from "@picoframe/plugin-sdk";
import { Hand, Settings } from "lucide-react";
import TopBarGreeting from "./slots/TopBarGreeting";

/**
 * The hello plugin's frontend half. Contributes a nav group, two lazy routes,
 * and a top-bar slot. Pair it with the `tauri-plugin-picoframe-hello` crate
 * (ACL id `picoframe-hello`) on the Rust side.
 */
const helloPlugin: FramePlugin = {
  id: "hello",
  version: "0.0.0",
  nav: [
    {
      id: "hello",
      label: "Hello",
      order: 10,
      items: [
        { id: "hello.home", label: "Home", to: "/hello", end: true, order: 0, icon: Hand },
        { id: "hello.settings", label: "Settings", to: "/hello/settings", order: 1, icon: Settings },
      ],
    },
  ],
  routes: [
    { path: "hello", lazy: () => import("./pages/HelloPage"), crumb: "Hello" },
    { path: "hello/settings", lazy: () => import("./pages/HelloSettings"), crumb: "Settings" },
  ],
  slots: [{ slot: "topbar.right", order: 10, Component: TopBarGreeting }],
};

export default helloPlugin;
