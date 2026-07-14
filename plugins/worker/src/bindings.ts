import { defineCommand } from "@picoframe/plugin-sdk";

/** Health payload from `worker_status` (inside the `CliResult`). */
export interface WorkerStatus {
  healthy: boolean;
}

/** Summary payload from a completed `worker_crunch` run. */
export interface CrunchResult {
  crunched: number;
}

/** The Tauri event prefix the worker sidecar streams progress on. */
export const WORKER_EVENT_PREFIX = "picoframe://sidecar/worker";

/** Is the sidecar server up? Bound to `plugin:picoframe-worker|worker_status`. */
export const workerStatus = defineCommand<undefined, WorkerStatus>("picoframe-worker", "worker_status");

/**
 * Run a "crunch" job of `count` items on the sidecar. Resolves with the summary once done;
 * per-item progress arrives out-of-band on `WORKER_EVENT_PREFIX/progress` (see
 * `useSidecarProgress`). Bound to `plugin:picoframe-worker|worker_crunch`.
 */
export const workerCrunch = defineCommand<{ count: number }, CrunchResult>(
  "picoframe-worker",
  "worker_crunch",
);
