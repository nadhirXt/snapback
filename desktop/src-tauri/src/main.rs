#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod hosts;
mod platform;
mod watcher;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WindowEvent,
};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Build System Tray Menu
            let open_i = MenuItem::with_id(app, "open", "Ouvrir SnapBack", true, None::<&str>)?;
            let sess_i = MenuItem::with_id(
                app,
                "session25",
                "Session Focus 25 min",
                true,
                None::<&str>,
            )?;
            let quit_i = MenuItem::with_id(app, "quit", "Quitter SnapBack", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &sess_i, &quit_i])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "session25" => {
                        let _ = app.emit("tray-start-session", 25);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }
            let _ = tray_builder.build(app)?;

            // Start OS Active Window Watcher
            watcher::spawn_window_watcher(app.handle().clone());

            Ok(())
        })
        .on_window_event(|window, event| {
            // Keep running in system tray when main window is closed
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_state,
            commands::save_state,
            commands::list_windows,
            commands::active_window,
            commands::focus_window,
            commands::minimize_window,
            commands::close_browser_tab,
            commands::kill_process,
            commands::show_overlay,
            commands::hide_overlay,
            commands::set_strict_mode
        ])
        .run(tauri::generate_context!())
        .expect("error while running SnapBack desktop application");
}
