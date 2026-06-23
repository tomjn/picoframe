//! Example "hello" plugin (Rust half). Proves the full-stack picoframe plugin
//! contract: a Tauri v2 plugin exposing one command that returns a [`CliResult`].

use picoframe_core::CliResult;
use serde_json::json;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[tauri::command]
async fn hello_greet(name: String) -> CliResult {
    let name = if name.trim().is_empty() { "world".to_string() } else { name };
    CliResult::ok(json!({ "message": format!("Hello, {name}!") }))
}

/// Build the plugin. Registered as `"picoframe-hello"` (the crate name minus the
/// `tauri-plugin-` prefix), so the frontend invokes `plugin:picoframe-hello|hello_greet`.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("picoframe-hello")
        .invoke_handler(tauri::generate_handler![hello_greet])
        .build()
}
