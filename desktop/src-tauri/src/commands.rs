use crate::hosts::sync_system_hosts;
use crate::platform::{current_platform, kill_process_by_name, WinInfo};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

static INTERCEPTION_SEQ: AtomicU64 = AtomicU64::new(0);
static ACTIVE_OVERLAY: Mutex<Option<(u64, Value)>> = Mutex::new(None);

fn state_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Cannot resolve config dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create config dir: {e}"))?;
    Ok(dir.join("snapback_state.json"))
}

/// Executes the SnapBack close + focus sequence on a native Rust thread
/// so it is never throttled by WebKit2GTK / WebView2 when the main window is hidden.
fn execute_snapback_native(app: &AppHandle, target_seq: Option<u64>) {
    let payload_opt = {
        let Ok(mut guard) = ACTIVE_OVERLAY.lock() else {
            return;
        };
        match (&*guard, target_seq) {
            (Some((seq, _)), Some(expected)) if *seq != expected => return,
            (Some(_), _) => guard.take().map(|(_, v)| v),
            (None, _) => None,
        }
    };

    if let Some(win) = app.get_webview_window("overlay") {
        let _ = win.hide();
    }

    let Some(ctx) = payload_opt else {
        return;
    };

    let app_clone = app.clone();
    thread::spawn(move || {
        // Wait 160ms for X11/Win32 window manager to completely unmap the overlay window
        thread::sleep(Duration::from_millis(160));

        let platform = current_platform();
        let kind = ctx
            .get("distractionKind")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let win_id = ctx
            .get("distractionWindowId")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let proc_name = ctx
            .get("distractionProcess")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let should_kill = ctx
            .get("shouldKill")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let return_id = ctx
            .get("returnTarget")
            .and_then(|rt| rt.get("id"))
            .and_then(|v| v.as_u64())
            .unwrap_or(0);

        if kind == "distraction-site" && win_id > 0 {
            let _ = platform.send_close_tab(win_id);
        } else if kind == "distraction-app" {
            if should_kill && !proc_name.is_empty() {
                let _ = kill_process_by_name(proc_name);
            } else if win_id > 0 {
                let _ = platform.close_window(win_id);
            }
        }

        if return_id > 0 {
            thread::sleep(Duration::from_millis(90));
            let _ = platform.focus_window(return_id);
        }

        let _ = app_clone.emit("overlay-complete", &ctx);
    });
}

#[tauri::command]
pub fn load_state(app: AppHandle) -> Result<Option<Value>, String> {
    let path = state_file_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let parsed: Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    Ok(Some(parsed))
}

#[tauri::command]
pub fn save_state(app: AppHandle, state: Value) -> Result<(), String> {
    let path = state_file_path(&app)?;
    let pretty = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    fs::write(&path, pretty).map_err(|e| e.to_string())?;
    let _ = app.emit("state-updated", &state);
    Ok(())
}

#[tauri::command]
pub fn list_windows() -> Vec<WinInfo> {
    current_platform().list_windows()
}

#[tauri::command]
pub fn active_window() -> Option<WinInfo> {
    current_platform().active_window()
}

#[tauri::command]
pub fn focus_window(id: u64) -> Result<(), String> {
    current_platform().focus_window(id)
}

#[tauri::command]
pub fn minimize_window(id: u64) -> Result<(), String> {
    current_platform().minimize_window(id)
}

#[tauri::command]
pub fn close_window(id: u64) -> Result<(), String> {
    current_platform().close_window(id)
}

#[tauri::command]
pub fn close_browser_tab(id: u64) -> Result<(), String> {
    current_platform().send_close_tab(id)
}

#[tauri::command]
pub fn kill_process(process_name: String) -> Result<usize, String> {
    kill_process_by_name(&process_name)
}

#[tauri::command]
pub fn show_overlay(app: AppHandle, payload: Value) -> Result<(), String> {
    let seq = INTERCEPTION_SEQ.fetch_add(1, Ordering::SeqCst) + 1;
    if let Ok(mut guard) = ACTIVE_OVERLAY.lock() {
        *guard = Some((seq, payload.clone()));
    }

    if let Some(win) = app.get_webview_window("overlay") {
        let _ = win.center();
        let _ = win.show();
        let _ = win.set_always_on_top(true);
    }
    let _ = app.emit("overlay-context", payload);

    // Native 3-second timer in Rust (never throttled when main window is in background/tray)
    let app_for_timer = app.clone();
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(3050));
        execute_snapback_native(&app_for_timer, Some(seq));
    });

    Ok(())
}

#[tauri::command]
pub fn get_overlay_context() -> Option<Value> {
    ACTIVE_OVERLAY
        .lock()
        .ok()
        .and_then(|g| g.as_ref().map(|(_, v)| v.clone()))
}

#[tauri::command]
pub fn trigger_overlay_complete(app: AppHandle) -> Result<(), String> {
    execute_snapback_native(&app, None);
    Ok(())
}

#[tauri::command]
pub fn hide_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("overlay") {
        let _ = win.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn set_strict_mode(domains: Vec<String>, enable: bool) -> Result<(), String> {
    sync_system_hosts(&domains, enable)
}
