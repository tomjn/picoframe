// Prevents an extra console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let mut builder = tauri::Builder::default()
        .plugin(picoframe_core::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build());
    // picoframe:plugins-start
    builder = builder.plugin(tauri_plugin_picoframe_hello::init());
    builder = builder.plugin(tauri_plugin_picoframe_worker::init());
    // picoframe:plugins-end
    builder
        .setup(|app| {
            picoframe_core::reveal_main_window(app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running picoframe demo");
}
