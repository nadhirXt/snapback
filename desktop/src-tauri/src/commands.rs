use crate::hosts::sync_system_hosts;
use crate::platform::{current_platform, kill_process_by_name, WinInfo};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

fn state_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Cannot resolve config dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create config dir: {e}"))?;
    Ok(dir.join("snapback_state.json"))
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
pub fn close_browser_tab(id: u64) -> Result<(), String> {
    current_platform().send_close_tab(id)
}

#[tauri::command]
pub fn kill_process(process_name: String) -> Result<usize, String> {
    kill_process_by_name(&process_name)
}

#[tauri::command]
pub fn show_overlay(app: AppHandle, payload: Value) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("overlay") {
        let _ = win.center();
        let _ = win.show();
        let _ = win.set_always_on_top(true);
        let _ = win.set_focus();
    }
    let _ = app.emit("overlay-context", payload);
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
