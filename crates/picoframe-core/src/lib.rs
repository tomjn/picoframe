//! Core types and the base frame plugin for picoframe Tauri apps.
//!
//! Every picoframe plugin command returns a [`CliResult`] — a small, uniform
//! envelope the frontend's typed `defineCommand` bindings unwrap. This mirrors
//! the engineer-assist `CliResult` pattern but trimmed to the essentials.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Runtime,
};

#[cfg(target_os = "macos")]
mod mouse_nav;

pub mod sidecar;
pub use sidecar::{Sidecar, SidecarOptions};

/// Uniform result envelope returned by picoframe plugin commands.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CliResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub data: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
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

/// Reveal the app's `main` window with a background colour matching the OS
/// light/dark appearance, so no default-white webview frame flashes before the
/// UI paints. The native window pane that appears first follows the OS theme, so
/// matching the webview background to it keeps the two seamless.
///
/// The `main` window must be created hidden (`"visible": false` in
/// `tauri.conf.json`): the webview paints white the instant it becomes visible,
/// too early for any in-page script to prevent. Call this from the app's
/// `.setup()` hook, where config windows already exist (they do not during
/// plugin setup). A missing window or a failed colour/show call is ignored - the
/// worst case is the unfixed flash, never a hidden window on the happy path.
pub fn reveal_main_window<R: Runtime>(app: &AppHandle<R>) {
    use tauri::{window::Color, Manager, Theme};

    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    // Mirrors picoframe's `--background` tokens: dark is hsl(240 6% 7%), which is
    // rgb(17, 17, 19); light is white.
    let color = match window.theme() {
        Ok(Theme::Dark) => Color(17, 17, 19, 255),
        _ => Color(255, 255, 255, 255),
    };
    let _ = window.set_background_color(Some(color));
    let _ = window.show();
}

/// The single disk store file picoframe apps share, in the app data dir. Both the JS
/// side (`@picoframe/store`'s `createTauriStore`) and Rust plugins open this file, so
/// no plugin needs to own "the" store. Namespace keys by convention, e.g. `"hello.draft"`.
pub const STORE_PATH: &str = "picoframe.json";

/// Handle to the shared picoframe store for the Rust side. Requires the app to register
/// `tauri_plugin_store::Builder::default().build()` (the CLI app template does this).
pub fn store<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<std::sync::Arc<tauri_plugin_store::Store<R>>, tauri_plugin_store::Error> {
    use tauri_plugin_store::StoreExt;
    app.store(STORE_PATH)
}
