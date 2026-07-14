/**
 * picoframe worker sidecar — a long-lived local HTTP server.
 *
 * This is the reference implementation of the picoframe sidecar wire contract. A
 * picoframe app's Rust side (via `picoframe_core::sidecar`) spawns this process once
 * at startup, reads the port + shared-secret token from a handshake file, polls
 * `/health`, then holds an SSE connection to `/events` and re-emits progress as Tauri
 * events. Every request must carry `Authorization: Bearer <token>`.
 *
 * Env contract (set by the parent):
 *   PICOFRAME_SIDECAR_TOKEN      required — shared secret every request must present
 *   PICOFRAME_SIDECAR_HANDSHAKE  required — path to write {port,token,pid} once bound
 *   PICOFRAME_SIDECAR_PARENT_PID optional — parent pid; self-exit if the parent dies
 *   PICOFRAME_SIDECAR_HOST       optional — bind host, default 127.0.0.1
 *
 * Runnable standalone for tests: set the two required env vars and `bun run server.ts`.
 */
import { timingSafeEqual } from "node:crypto";
import { chmodSync, renameSync, unlinkSync, writeFileSync } from "node:fs";

const TOKEN = requireEnv("PICOFRAME_SIDECAR_TOKEN");
const HANDSHAKE = requireEnv("PICOFRAME_SIDECAR_HANDSHAKE");
const HOST = process.env.PICOFRAME_SIDECAR_HOST || "127.0.0.1";
const PARENT_PID = process.env.PICOFRAME_SIDECAR_PARENT_PID
  ? Number(process.env.PICOFRAME_SIDECAR_PARENT_PID)
  : undefined;

/** The uniform envelope mirrored on the Rust/TS side as `CliResult`. */
interface CliResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Progress record streamed over SSE and re-emitted by Rust as a Tauri event. */
interface ProgressEvent {
  type: "progress";
  op: string;
  status: "running" | "complete" | "failed";
  current?: number;
  total?: number;
  detail?: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`[picoframe-worker] missing required env ${name}`);
    process.exit(2);
  }
  return v;
}

// --- SSE fan-out --------------------------------------------------------------
// Every /events subscriber registers its stream controller here; emitProgress
// broadcasts to all of them. A long-running command streams progress this way
// while its POST response is still pending.
const subscribers = new Set<ReadableStreamDefaultController<Uint8Array>>();
const encoder = new TextEncoder();

function emitProgress(event: ProgressEvent): void {
  const frame = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  for (const controller of subscribers) {
    try {
      controller.enqueue(frame);
    } catch {
      subscribers.delete(controller);
    }
  }
}

// --- auth ---------------------------------------------------------------------
function authorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = encoder.encode(presented);
  const b = encoder.encode(TOKEN);
  // Length must match for timingSafeEqual; an unequal length is simply unauthorized.
  return a.length === b.length && timingSafeEqual(a, b);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// --- command dispatch ---------------------------------------------------------
async function runCommand(command: string, args: Record<string, unknown>): Promise<CliResult> {
  switch (command) {
    case "crunch":
      return crunch(args);
    default:
      return { success: false, error: `unknown command: ${command}` };
  }
}

/**
 * Demo long-running job: "crunch" `count` items, emitting a progress event per
 * item, then resolve with a summary. Exercises the full streaming path.
 */
async function crunch(args: Record<string, unknown>): Promise<CliResult> {
  const count = Math.max(1, Math.min(500, Number(args.count) || 20));
  const delayMs = Math.max(0, Math.min(1000, Number(args.delayMs) || 120));
  for (let i = 1; i <= count; i++) {
    emitProgress({
      type: "progress",
      op: "crunch",
      status: "running",
      current: i,
      total: count,
      detail: `Crunched item ${i} of ${count}`,
    });
    if (delayMs > 0) await Bun.sleep(delayMs);
  }
  emitProgress({ type: "progress", op: "crunch", status: "complete", current: count, total: count });
  return { success: true, data: { crunched: count } };
}

// --- HTTP server --------------------------------------------------------------
const server = Bun.serve({
  hostname: HOST,
  port: 0, // ephemeral — the OS assigns a free port, reported via the handshake
  async fetch(req) {
    const url = new URL(req.url);

    if (!authorized(req)) {
      return json({ success: false, error: "unauthorized" }, 401);
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return json({ ok: true });
    }

    if (req.method === "GET" && url.pathname === "/events") {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          subscribers.add(controller);
          controller.enqueue(encoder.encode(": connected\n\n"));
        },
        cancel() {
          // Removal on cancel is best-effort; enqueue failures also prune (above).
        },
      });
      return new Response(stream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
      });
    }

    if (req.method === "POST" && url.pathname === "/command") {
      let body: { command?: string; args?: Record<string, unknown> };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        return json({ success: false, error: "invalid JSON body" }, 400);
      }
      if (!body.command) return json({ success: false, error: "missing command" }, 400);
      const result = await runCommand(body.command, body.args ?? {});
      return json(result);
    }

    return json({ success: false, error: "not found" }, 404);
  },
});

// --- handshake ---------------------------------------------------------------
// Written only after the server is bound, so the advertised port is real. Atomic
// (temp + rename) at 0600 so the parent never reads a partial file and the token
// isn't world-readable.
function writeHandshake(): void {
  const payload = JSON.stringify({ port: server.port, token: TOKEN, pid: process.pid });
  const tmp = `${HANDSHAKE}.tmp.${process.pid}`;
  writeFileSync(tmp, payload, { mode: 0o600 });
  chmodSync(tmp, 0o600);
  renameSync(tmp, HANDSHAKE);
}
writeHandshake();
console.error(`[picoframe-worker] listening on http://${HOST}:${server.port}`);

// --- lifecycle ----------------------------------------------------------------
let shuttingDown = false;
function shutdown(code = 0): void {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    server.stop(true);
  } catch {}
  try {
    unlinkSync(HANDSHAKE);
  } catch {}
  process.exit(code);
}

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

// Orphan guard: tokio's kill-on-drop (and any parent-side kill) does not run if the
// parent is SIGKILLed. Watch the parent pid and self-exit if it disappears, so no
// server is ever left running after the app is gone.
if (PARENT_PID !== undefined) {
  setInterval(() => {
    try {
      process.kill(PARENT_PID, 0); // signal 0 = existence check, doesn't kill
    } catch {
      shutdown(0);
    }
  }, 1000).unref();
}
