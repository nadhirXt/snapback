use serde::{Deserialize, Serialize};
use sysinfo::{Pid, System};

#[cfg(target_os = "linux")]
pub mod linux_x11;
#[cfg(target_os = "windows")]
pub mod windows;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WinInfo {
    pub id: u64,
    pub title: String,
    pub pid: u32,
    pub process_name: String,
}

pub trait Platform {
    fn active_window(&self) -> Option<WinInfo>;
    fn list_windows(&self) -> Vec<WinInfo>;
    fn focus_window(&self, id: u64) -> Result<(), String>;
    fn minimize_window(&self, id: u64) -> Result<(), String>;
    fn send_close_tab(&self, id: u64) -> Result<(), String>;
}

/// Resolves a process executable name from its OS PID using `sysinfo 0.30`.
pub fn process_name_for_pid(pid: u32) -> String {
    if pid == 0 {
        return String::new();
    }
    let mut sys = System::new();
    let sys_pid = Pid::from_u32(pid);
    sys.refresh_processes();
    if let Some(proc_info) = sys.process(sys_pid) {
        proc_info.name().to_string()
    } else {
        String::new()
    }
}

/// Terminates processes matching the given process name.
pub fn kill_process_by_name(target_name: &str) -> Result<usize, String> {
    let clean = target_name.trim().to_lowercase();
    if clean.is_empty() {
        return Err("Empty process name".into());
    }
    let mut sys = System::new_all();
    sys.refresh_all();
    let mut killed = 0usize;
    for process in sys.processes().values() {
        let name = process.name().to_lowercase();
        let stem = name.trim_end_matches(".exe");
        if name == clean || stem == clean {
            if process.kill() {
                killed += 1;
            }
        }
    }
    Ok(killed)
}

pub fn current_platform() -> Box<dyn Platform + Send + Sync> {
    #[cfg(target_os = "linux")]
    {
        Box::new(linux_x11::LinuxX11Platform::new())
    }
    #[cfg(target_os = "windows")]
    {
        Box::new(windows::WindowsPlatform::new())
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        Box::new(UnsupportedPlatform)
    }
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
struct UnsupportedPlatform;

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
impl Platform for UnsupportedPlatform {
    fn active_window(&self) -> Option<WinInfo> {
        None
    }
    fn list_windows(&self) -> Vec<WinInfo> {
        Vec::new()
    }
    fn focus_window(&self, _id: u64) -> Result<(), String> {
        Err("Unsupported OS".into())
    }
    fn minimize_window(&self, _id: u64) -> Result<(), String> {
        Err("Unsupported OS".into())
    }
    fn send_close_tab(&self, _id: u64) -> Result<(), String> {
        Err("Unsupported OS".into())
    }
}
