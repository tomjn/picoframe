// Prevents an extra console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let mut builder = tauri::Builder::default()
        .plugin(picoframe_core::init());
    // picoframe:plugins-start
    // picoframe:plugins-end
    builder
        .run(tauri::generate_context!())
        .expect("error while running {{APP_NAME}}");
}
