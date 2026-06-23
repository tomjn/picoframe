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
/// It currently registers no commands — window/theme commands land in Phase 1.
/// It exists now so the generated `main.rs` template can call
/// `.plugin(picoframe_core::init())` as a stable anchor above the plugin markers.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("picoframe").build()
}
