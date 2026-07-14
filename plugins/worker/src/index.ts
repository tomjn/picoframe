import type { FramePlugin } from "@picoframe/plugin-sdk";
import { Server } from "lucide-react";

/**
 * The worker plugin's frontend half. Demonstrates the picoframe long-lived sidecar pattern:
 * a persistent Bun HTTP server (managed by the `tauri-plugin-picoframe-worker` crate, ACL id
 * `picoframe-worker`) that streams progress to the UI. Contributes one nav item and route.
 */
const workerPlugin: FramePlugin = {
  id: "worker",
  version: "0.0.0",
  nav: [
    {
      id: "worker",
      label: "Worker",
      order: 20,
      items: [{ id: "worker.home", label: "Sidecar", to: "/worker", order: 0, icon: Server }],
    },
  ],
  routes: [{ path: "worker", lazy: () => import("./pages/WorkerPage"), crumb: "Sidecar" }],
};

export default workerPlugin;
