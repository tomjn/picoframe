"use client";

import { type ProgressEvent, onSidecarProgress } from "@picoframe/plugin-sdk";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useStrings } from "../strings/strings";

export interface SidecarProgressOptions {
  /** Toast title while running. Default: the event's `detail`, else the `sidecarWorking` string. */
  runningTitle?: (event: ProgressEvent) => string;
  /** Toast title on completion. Default: the `sidecarDone` string, "Done" in English. */
  completeTitle?: (event: ProgressEvent) => string;
}

/**
 * Drive a single, self-updating progress toast from a sidecar's event stream. Subscribes to
 * `"<eventPrefix>/progress"`, reuses one toast id so `running` updates in place and
 * `complete`/`failed` transition the same toast. Call from a component mounted for the
 * lifetime you want progress surfaced; it unsubscribes on unmount.
 *
 * A plugin uses this to show progress without importing sonner or any registry component —
 * the frame owns the toast surface (see {@link Toaster}).
 */
export function useSidecarProgress(eventPrefix: string, options: SidecarProgressOptions = {}): void {
  const { runningTitle, completeTitle } = options;
  // Read through a ref so a host passing a new table each render does not resubscribe.
  const strings = useStrings();
  const stringsRef = useRef(strings);
  stringsRef.current = strings;
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    // One shared id ties the running/complete/failed updates to a single toast.
    let id: string | number | undefined;

    onSidecarProgress(eventPrefix, (event) => {
      const description =
        event.current != null && event.total != null
          ? `${event.current} / ${event.total}`
          : undefined;
      if (event.status === "running") {
        const title = runningTitle?.(event) ?? event.detail ?? stringsRef.current.sidecarWorking(event.op);
        id = toast.loading(title, { id, description });
      } else if (event.status === "complete") {
        toast.success(completeTitle?.(event) ?? stringsRef.current.sidecarDone, { id, description });
        id = undefined;
      } else {
        toast.error(event.detail ?? stringsRef.current.sidecarFailed(event.op), { id, description });
        id = undefined;
      }
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [eventPrefix, runningTitle, completeTitle]);
}
