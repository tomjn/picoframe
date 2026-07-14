//! Example long-lived sidecar plugin (Rust half). Demonstrates the picoframe sidecar
//! pattern: a persistent Bun HTTP server spawned once at startup, called over loopback
//! with a shared-secret token, streaming progress to the UI as Tauri events.
//!
//! The heavy lifting (spawn, handshake, health, SSE bridge, restart, kill-on-exit) lives in
//! [`picoframe_core::sidecar`]; this crate just configures it and exposes two commands.

use picoframe_core::{CliResult, Sidecar, SidecarOptions};
use serde_json::json;
use std::time::Duration;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, RunEvent, Runtime, State,
};

/// Report whether the sidecar server is up and answering `/health`.
#[tauri::command]
async fn worker_status(sidecar: State<'_, Sidecar>) -> Result<CliResult, String> {
    let sidecar = sidecar.inner().clone();
    let healthy = tauri::async_runtime::spawn_blocking(move || sidecar.healthy())
        .await
        .map_err(|e| e.to_string())?;
    Ok(if healthy {
        CliResult::ok(json!({ "healthy": true }))
    } else {
        CliResult::err("sidecar is not healthy")
    })
}

/// Kick off a "crunch" job on the sidecar. Returns the final summary once done; per-item
/// progress streams to the UI meanwhile as `picoframe://sidecar/worker/progress` events.
#[tauri::command]
async fn worker_crunch(count: u32, sidecar: State<'_, Sidecar>) -> Result<CliResult, String> {
    let sidecar = sidecar.inner().clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        sidecar.request("crunch", json!({ "count": count }))
    })
    .await
    .map_err(|e| e.to_string())?;
    Ok(result)
}

/// Under `tauri dev` the compiled sidecar binary may not exist yet; fall back to running the
/// plugin's `server.ts` with Bun. The path is resolved at compile time relative to this crate.
fn dev_command() -> Option<Vec<String>> {
    let server = concat!(env!("CARGO_MANIFEST_DIR"), "/../../plugins/worker/sidecar/server.ts");
    std::path::Path::new(server)
        .exists()
        .then(|| vec!["bun".to_string(), "run".to_string(), server.to_string()])
}

/// Build the plugin. Registered as `"picoframe-worker"`, so the frontend invokes
/// `plugin:picoframe-worker|worker_crunch`. The sidecar is spawned in `setup` and killed on
/// app exit; a spawn failure is logged but does not abort startup (the UI surfaces the
/// unhealthy state).
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("picoframe-worker")
        .invoke_handler(tauri::generate_handler![worker_status, worker_crunch])
        .setup(|app, _api| {
            let opts = SidecarOptions {
                bin: "picoframe-worker-sidecar".to_string(),
                dev_command: dev_command(),
                event_prefix: "picoframe://sidecar/worker".to_string(),
                ready_timeout: Duration::from_secs(15),
                restart: true,
            };
            match Sidecar::spawn(app, opts) {
                Ok(sidecar) => {
                    app.manage(sidecar);
                }
                Err(e) => {
                    eprintln!("[picoframe-worker] sidecar failed to start: {e}");
                }
            }
            Ok(())
        })
        .on_event(|app, event| {
            if matches!(event, RunEvent::Exit) {
                if let Some(sidecar) = app.try_state::<Sidecar>() {
                    sidecar.shutdown();
                }
            }
        })
        .build()
}
