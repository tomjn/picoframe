//! Core types and the base frame plugin for picoframe Tauri apps.
//!
//! Every picoframe plugin command returns a [`CliResult`] — a small, uniform
//! envelope the frontend's typed `defineCommand` bindings unwrap. This mirrors
//! the engineer-assist `CliResult` pattern but trimmed to the essentials.

use serde::Serialize;
use serde_json::Value;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[cfg(target_os = "macos")]
mod mouse_nav;

/// Uniform result envelope returned by picoframe plugin commands.
#[derive(Debug, Clone, Serialize)]
pub struct CliResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl CliResult {
    /// A successful result carrying a JSON payload.
    pub fn ok(data: Value) -> Self {
        Self { success: true, data: Some(data), error: None }
    }

    /// A failed result carrying an error message.
    pub fn err(message: impl Into<String>) -> Self {
        Self { success: false, data: None, error: Some(message.into()) }
    }
}

/// The base frame plugin. Registered first in every picoframe app's builder.
///
/// On macOS its `setup` installs a native NSEvent monitor that emits `mouse-nav`
/// for the X1/X2 mouse buttons (the frame's `useMouseNavigation` hook handles the
/// DOM path on Windows/Linux). It registers no commands yet — window/theme
/// commands land later — and anchors the generated `main.rs`
/// `.plugin(picoframe_core::init())` call above the plugin markers.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("picoframe")
        .setup(|_app, _api| {
            #[cfg(target_os = "macos")]
            mouse_nav::install(_app.clone());
            Ok(())
        })
        .build()
}
