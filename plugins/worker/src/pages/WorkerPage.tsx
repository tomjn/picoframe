import { Button, useSidecarProgress } from "@picoframe/frame";
import { useEffect, useState } from "react";
import { type CrunchResult, WORKER_EVENT_PREFIX, workerCrunch, workerStatus } from "../bindings";

/**
 * Exercises the long-lived sidecar end-to-end: reads the server's health on mount, runs a
 * streaming "crunch" job, and surfaces per-item progress as a self-updating toast (via the
 * frame's `useSidecarProgress`). The final summary is returned over IPC once the job ends.
 */
export default function WorkerPage() {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CrunchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Progress events for the whole page lifetime -> one live toast.
  useSidecarProgress(WORKER_EVENT_PREFIX);

  useEffect(() => {
    let active = true;
    workerStatus(undefined)
      .then((s) => active && setHealthy(s.healthy))
      .catch(() => active && setHealthy(false));
    return () => {
      active = false;
    };
  }, []);

  async function crunch() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await workerCrunch({ count: 40 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid max-w-prose gap-4 p-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Sidecar worker</h1>
        <p className="text-muted-foreground">
          A persistent Bun HTTP server spawned once at startup, called over loopback with a
          shared-secret token. Run a job and watch progress stream in as a toast.
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span
          className={
            "inline-block size-2 rounded-full " +
            (healthy == null ? "bg-muted-foreground" : healthy ? "bg-green-500" : "bg-destructive")
          }
        />
        <span className="text-muted-foreground">
          {healthy == null ? "Checking sidecar…" : healthy ? "Sidecar healthy" : "Sidecar unavailable"}
        </span>
      </div>

      <div>
        <Button onClick={crunch} disabled={running || healthy === false}>
          {running ? "Crunching…" : "Crunch 40 items"}
        </Button>
      </div>

      {result && (
        <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-card-foreground">
          Done — crunched {result.crunched} items.
        </p>
      )}
      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
