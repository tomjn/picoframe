import { type UnlistenFn, listen } from "@tauri-apps/api/event";

/**
 * A progress record streamed from a picoframe sidecar server and re-emitted by the Rust side
 * as the Tauri event `"<event_prefix>/progress"`. Mirrors the server's SSE payload.
 */
export interface ProgressEvent {
  type: "progress";
  /** The operation this progress belongs to, e.g. `"crunch"`. */
  op: string;
  status: "running" | "complete" | "failed";
  /** Completed units so far (present for determinate progress). */
  current?: number;
  /** Total units (present for determinate progress). */
  total?: number;
  /** Human-readable detail for the current step. */
  detail?: string;
}

/**
 * Subscribe to a sidecar's progress event stream. `eventPrefix` is the plugin's configured
 * prefix (e.g. `"picoframe://sidecar/worker"`); this listens on `"<eventPrefix>/progress"`.
 * Returns the unlisten function — call it on unmount.
 */
export function onSidecarProgress(
  eventPrefix: string,
  handler: (event: ProgressEvent) => void,
): Promise<UnlistenFn> {
  return listen<ProgressEvent>(`${eventPrefix}/progress`, (e) => handler(e.payload));
}
