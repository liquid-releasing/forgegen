mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(commands::CancelRegistry::new())
        .setup(|_app| {
            // Auto-open devtools on debug builds so the console is always
            // visible during dev. WebView2's F12 binding is unreliable; this
            // guarantees the inspector is there.
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                if let Some(window) = _app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_patterns,
            commands::analyze_media,
            commands::auto_chapter,
            commands::read_sidecar,
            commands::generate_funscript,
            commands::read_recents,
            commands::add_recent,
            commands::remove_recent,
            commands::cancel_run,
            commands::read_funscript,
            commands::reveal_in_explorer,
            commands::save_funscript_copy,
            commands::list_funscript_versions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
