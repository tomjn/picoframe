//! Long-lived local server ("sidecar") lifecycle for picoframe apps.
//!
//! A sidecar is a persistent localhost HTTP server (e.g. a Bun process) spawned once at
//! app startup, so substantial non-Rust business logic runs in-process without per-call
//! subprocess cold-start. This module owns the full lifecycle:
//!
//! - **spawn** the bundled binary (Tauri `externalBin`, resolved next to the app exe) or a
//!   dev command (`bun run server.ts`) when the compiled binary is absent under `tauri dev`;
//! - **handshake** — the child binds an ephemeral `127.0.0.1` port and writes a `0600`
//!   `{port,token,pid}` file we poll; the token is a per-spawn shared secret we generate;
//! - **health** — poll `GET /health` (bearer auth) until ready or timeout;
//! - **stream** — hold an SSE connection to `GET /events` and re-emit each progress record
//!   as the Tauri event `"<event_prefix>/progress"`;
//! - **supervise** — if the child exits unexpectedly and `restart` is set, respawn it;
//! - **shutdown** — kill the child on app exit. (The child also self-exits if it sees the
//!   parent pid disappear, covering the SIGKILL case that a parent-side kill cannot.)
//!
//! Transport is loopback TCP + a shared-secret bearer token rather than a Unix socket, so
//! the same code path works on Windows, macOS and Linux.

use crate::CliResult;
use serde::Deserialize;
use serde_json::Value;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Runtime};

/// Configuration for a supervised sidecar.
#[derive(Clone)]
pub struct SidecarOptions {
    /// `externalBin` base name bundled next to the app executable, e.g.
    /// `"picoframe-worker-sidecar"` (the platform triple/suffix is added at resolve time).
    pub bin: String,
    /// Fallback command used under `tauri dev` when the compiled binary is not found next to
    /// the executable, e.g. `["bun", "run", "/abs/path/to/server.ts"]`. The first element is
    /// the program. Ignored in release builds.
    pub dev_command: Option<Vec<String>>,
    /// Tauri event name prefix; each streamed progress record is emitted as
    /// `"<event_prefix>/progress"`.
    pub event_prefix: String,
    /// How long to wait for the handshake file + a healthy `/health` before failing.
    pub ready_timeout: Duration,
    /// Respawn the child (and reconnect the event stream) if it exits unexpectedly.
    pub restart: bool,
}

impl SidecarOptions {
    /// Sensible defaults: no dev command, 10s readiness window, restart on crash.
    pub fn new(bin: impl Into<String>, event_prefix: impl Into<String>) -> Self {
        Self {
            bin: bin.into(),
            dev_command: None,
            event_prefix: event_prefix.into(),
            ready_timeout: Duration::from_secs(10),
            restart: true,
        }
    }
}

#[derive(Deserialize)]
struct Handshake {
    port: u16,
    token: String,
}

struct Connection {
    port: u16,
    token: String,
    child: Child,
}

/// A running, supervised sidecar. Cheaply cloneable (`Arc` inside); dropping the last clone
/// kills the child.
#[derive(Clone)]
pub struct Sidecar(Arc<Inner>);

struct Inner {
    conn: Mutex<Connection>,
    http: reqwest::blocking::Client,
    shutting_down: AtomicBool,
}

impl Sidecar {
    /// Spawn the sidecar and block until it is healthy (or `ready_timeout` elapses), then
    /// start the background event-stream bridge and crash supervisor. Returns an error if the
    /// process cannot be spawned or never becomes healthy.
    pub fn spawn<R: Runtime>(app: &AppHandle<R>, opts: SidecarOptions) -> Result<Sidecar, String> {
        // A connect timeout (fail fast if the server is down) but NO total-request timeout: the
        // `/events` SSE stream is long-lived and a `/command` job may run for minutes. Fast
        // calls set their own per-request timeout instead (see `healthy`).
        let http = reqwest::blocking::Client::builder()
            .connect_timeout(Duration::from_secs(5))
            .build()
            .map_err(|e| format!("build http client: {e}"))?;

        let conn = start_process(&opts, &http)?;
        let sidecar = Sidecar(Arc::new(Inner {
            conn: Mutex::new(conn),
            http,
            shutting_down: AtomicBool::new(false),
        }));

        sidecar.clone().supervise(app.clone(), opts);
        Ok(sidecar)
    }

    /// Base URL of the running server, e.g. `http://127.0.0.1:54321`.
    fn base_url(&self) -> String {
        let conn = self.0.conn.lock().unwrap();
        format!("http://127.0.0.1:{}", conn.port)
    }

    fn token(&self) -> String {
        self.0.conn.lock().unwrap().token.clone()
    }

    /// Send a command to the sidecar and return its `CliResult`. Blocking — call from an
    /// async Tauri command via `tauri::async_runtime::spawn_blocking`. A transport failure is
    /// mapped to a failed `CliResult` so callers always get a uniform envelope.
    pub fn request(&self, command: &str, args: Value) -> CliResult {
        let url = format!("{}/command", self.base_url());
        let res = self
            .0
            .http
            .post(&url)
            .bearer_auth(self.token())
            .json(&serde_json::json!({ "command": command, "args": args }))
            .send()
            .and_then(|r| r.json::<CliResult>());
        match res {
            Ok(result) => result,
            Err(e) => CliResult::err(format!("sidecar request failed: {e}")),
        }
    }

    /// Whether the server currently answers `GET /health` with 200.
    pub fn healthy(&self) -> bool {
        let url = format!("{}/health", self.base_url());
        self.0
            .http
            .get(&url)
            .bearer_auth(self.token())
            .timeout(Duration::from_secs(2))
            .send()
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }

    /// Stop supervising and kill the child. Idempotent.
    pub fn shutdown(&self) {
        self.0.shutting_down.store(true, Ordering::SeqCst);
        if let Ok(mut conn) = self.0.conn.lock() {
            let _ = conn.child.kill();
            let _ = conn.child.wait();
        }
    }

    /// Background threads: (1) hold the SSE connection and re-emit events; (2) watch the child
    /// and respawn it on unexpected exit when `restart` is set.
    fn supervise<R: Runtime>(self, app: AppHandle<R>, opts: SidecarOptions) {
        // Event-stream bridge: reconnect while the sidecar is alive.
        let sse = self.clone();
        let sse_app = app.clone();
        let sse_prefix = opts.event_prefix.clone();
        std::thread::spawn(move || {
            while !sse.0.shutting_down.load(Ordering::SeqCst) {
                stream_events(&sse, &sse_app, &sse_prefix);
                // Dropped connection: pause before reconnecting so a hard-down server doesn't spin.
                std::thread::sleep(Duration::from_millis(500));
            }
        });

        // Crash supervisor: respawn on unexpected exit.
        let sup = self.clone();
        std::thread::spawn(move || loop {
            std::thread::sleep(Duration::from_millis(500));
            if sup.0.shutting_down.load(Ordering::SeqCst) {
                return;
            }
            let exited = {
                let mut conn = sup.0.conn.lock().unwrap();
                matches!(conn.child.try_wait(), Ok(Some(_)))
            };
            if !exited {
                continue;
            }
            if !opts.restart {
                return;
            }
            match start_process(&opts, &sup.0.http) {
                Ok(next) => {
                    *sup.0.conn.lock().unwrap() = next;
                    let _ = app.emit(&format!("{}/restarted", opts.event_prefix), ());
                }
                Err(e) => {
                    // Back off and retry on the next loop; surface once.
                    let _ = app.emit(&format!("{}/error", opts.event_prefix), e);
                    std::thread::sleep(Duration::from_secs(2));
                }
            }
        });
    }
}

impl Drop for Inner {
    fn drop(&mut self) {
        self.shutting_down.store(true, Ordering::SeqCst);
        if let Ok(mut conn) = self.conn.lock() {
            let _ = conn.child.kill();
            let _ = conn.child.wait();
        }
    }
}

/// Read the SSE stream and re-emit each `data:` progress record as a Tauri event. Returns when
/// the connection drops (server restart, network error) so the caller can reconnect.
fn stream_events<R: Runtime>(sidecar: &Sidecar, app: &AppHandle<R>, event_prefix: &str) {
    let url = format!("{}/events", sidecar.base_url());
    // No per-request timeout — this is a long-lived stream (the client has no total timeout).
    let resp = sidecar.0.http.get(&url).bearer_auth(sidecar.token()).send();
    let Ok(resp) = resp else { return };
    if !resp.status().is_success() {
        return;
    }
    let event = format!("{event_prefix}/progress");
    let reader = BufReader::new(resp);
    for line in reader.lines() {
        if sidecar.0.shutting_down.load(Ordering::SeqCst) {
            return;
        }
        let Ok(line) = line else { return };
        if let Some(payload) = line.strip_prefix("data: ") {
            if let Ok(value) = serde_json::from_str::<Value>(payload) {
                let _ = app.emit(&event, value);
            }
        }
    }
}

/// Spawn the child, wait for its handshake + health, and return a live connection.
fn start_process(opts: &SidecarOptions, http: &reqwest::blocking::Client) -> Result<Connection, String> {
    let token = random_token();
    let handshake_path = handshake_path(&opts.bin);
    // A stale handshake from a prior run would be read as this run's port; remove it first.
    let _ = std::fs::remove_file(&handshake_path);

    let mut cmd = resolve_command(opts)?;
    cmd.env("PICOFRAME_SIDECAR_TOKEN", &token)
        .env("PICOFRAME_SIDECAR_HANDSHAKE", &handshake_path)
        .env("PICOFRAME_SIDECAR_PARENT_PID", std::process::id().to_string())
        .env("PICOFRAME_SIDECAR_HOST", "127.0.0.1");

    let mut child = cmd.spawn().map_err(|e| format!("spawn sidecar `{}`: {e}", opts.bin))?;

    let deadline = Instant::now() + opts.ready_timeout;
    let handshake = match wait_for_handshake(&handshake_path, deadline) {
        Ok(h) => h,
        Err(e) => {
            let _ = child.kill();
            return Err(e);
        }
    };
    // The token in the handshake must match what we passed; a mismatch means a foreign process.
    if handshake.token != token {
        let _ = child.kill();
        return Err("sidecar handshake token mismatch".to_string());
    }

    let conn = Connection { port: handshake.port, token, child };
    let sidecar_url = format!("http://127.0.0.1:{}/health", conn.port);
    if let Err(e) = wait_for_health(http, &sidecar_url, &conn.token, deadline) {
        let mut conn = conn;
        let _ = conn.child.kill();
        return Err(e);
    }
    Ok(conn)
}

/// Build the `Command` to launch: the compiled `externalBin` next to the app exe, or the
/// dev command when that binary is absent (debug builds only).
fn resolve_command(opts: &SidecarOptions) -> Result<Command, String> {
    if let Some(path) = resolve_bin(&opts.bin) {
        return Ok(Command::new(path));
    }
    if cfg!(debug_assertions) {
        if let Some(dev) = &opts.dev_command {
            if let Some((program, args)) = dev.split_first() {
                let mut cmd = Command::new(program);
                cmd.args(args);
                return Ok(cmd);
            }
        }
    }
    Err(format!(
        "sidecar binary `{}` not found next to the executable (and no dev command available)",
        opts.bin
    ))
}

/// Resolve the bundled binary next to the current executable, as Tauri `externalBin` arranges.
/// `PICOFRAME_SIDECAR_BIN` overrides the full path (handy for dev and tests).
fn resolve_bin(bin: &str) -> Option<PathBuf> {
    if let Ok(p) = std::env::var("PICOFRAME_SIDECAR_BIN") {
        if !p.is_empty() {
            let path = PathBuf::from(p);
            return path.exists().then_some(path);
        }
    }
    let exe = std::env::current_exe().ok()?;
    let dir = exe.parent()?;
    let candidate = dir.join(format!("{bin}{}", std::env::consts::EXE_SUFFIX));
    candidate.exists().then_some(candidate)
}

fn handshake_path(bin: &str) -> PathBuf {
    std::env::temp_dir().join(format!("picoframe-sidecar-{bin}-{}.json", std::process::id()))
}

fn wait_for_handshake(path: &PathBuf, deadline: Instant) -> Result<Handshake, String> {
    loop {
        if let Ok(text) = std::fs::read_to_string(path) {
            if let Ok(h) = serde_json::from_str::<Handshake>(&text) {
                return Ok(h);
            }
        }
        if Instant::now() >= deadline {
            return Err("timed out waiting for sidecar handshake".to_string());
        }
        std::thread::sleep(Duration::from_millis(50));
    }
}

fn wait_for_health(
    http: &reqwest::blocking::Client,
    url: &str,
    token: &str,
    deadline: Instant,
) -> Result<(), String> {
    loop {
        let ok = http
            .get(url)
            .bearer_auth(token)
            .timeout(Duration::from_secs(1))
            .send()
            .map(|r| r.status().is_success())
            .unwrap_or(false);
        if ok {
            return Ok(());
        }
        if Instant::now() >= deadline {
            return Err("timed out waiting for sidecar to become healthy".to_string());
        }
        std::thread::sleep(Duration::from_millis(50));
    }
}

/// 256 bits of randomness, hex-encoded, for the per-spawn bearer token.
fn random_token() -> String {
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes).expect("os rng");
    let mut s = String::with_capacity(64);
    for b in bytes {
        s.push_str(&format!("{b:02x}"));
    }
    s
}
