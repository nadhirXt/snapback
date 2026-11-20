#![cfg(target_os = "windows")]

use super::{process_name_for_pid, Platform, WinInfo};
use std::mem::size_of;
use std::thread;
use std::time::Duration;
use windows::Win32::Foundation::{BOOL, HWND, LPARAM, WPARAM};
use windows::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VIRTUAL_KEY, VK_CONTROL,
};
use windows::Win32::UI::WindowsAndMessaging::{
    BringWindowToTop, EnumWindows, GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW,
    GetWindowThreadProcessId, IsWindowVisible, PostMessageW, SetForegroundWindow, ShowWindow,
    SW_MINIMIZE, SW_RESTORE, WM_CLOSE,
};

pub struct WindowsPlatform;

impl WindowsPlatform {
    pub fn new() -> Self {
        Self
    }

    fn inspect_hwnd(hwnd: HWND) -> Option<WinInfo> {
        unsafe {
            if hwnd.0.is_null() || !IsWindowVisible(hwnd).as_bool() {
                return None;
            }
            let len = GetWindowTextLengthW(hwnd);
            if len <= 0 {
                return None;
            }
            let mut buf = vec![0u16; (len + 1) as usize];
            let read = GetWindowTextW(hwnd, &mut buf);
            if read <= 0 {
                return None;
            }
            let title = String::from_utf16_lossy(&buf[..read as usize])
                .trim()
                .to_string();
            if title.is_empty() {
                return None;
            }
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));
            let process_name = process_name_for_pid(pid);
            Some(WinInfo {
                id: hwnd.0 as u64,
                title,
                pid,
                process_name,
            })
        }
    }
}

unsafe extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let list = &mut *(lparam.0 as *mut Vec<WinInfo>);
    if let Some(info) = WindowsPlatform::inspect_hwnd(hwnd) {
        list.push(info);
    }
    BOOL(1)
}

impl Platform for WindowsPlatform {
    fn active_window(&self) -> Option<WinInfo> {
        unsafe {
            let hwnd = GetForegroundWindow();
            Self::inspect_hwnd(hwnd)
        }
    }

    fn list_windows(&self) -> Vec<WinInfo> {
        let mut list: Vec<WinInfo> = Vec::new();
        unsafe {
            let ptr = &mut list as *mut Vec<WinInfo>;
            let _ = EnumWindows(Some(enum_windows_proc), LPARAM(ptr as isize));
        }
        list
    }

    fn focus_window(&self, id: u64) -> Result<(), String> {
        unsafe {
            let target_hwnd = HWND(id as *mut core::ffi::c_void);
            let fg_hwnd = GetForegroundWindow();
            let current_thread = GetCurrentThreadId();
            let fg_thread = GetWindowThreadProcessId(fg_hwnd, None);

            if current_thread != fg_thread && fg_thread != 0 {
                let _ = AttachThreadInput(current_thread, fg_thread, true);
                let _ = ShowWindow(target_hwnd, SW_RESTORE);
                let _ = BringWindowToTop(target_hwnd);
                let _ = SetForegroundWindow(target_hwnd);
                let _ = AttachThreadInput(current_thread, fg_thread, false);
            } else {
                let _ = ShowWindow(target_hwnd, SW_RESTORE);
                let _ = SetForegroundWindow(target_hwnd);
            }
        }
        Ok(())
    }

    fn minimize_window(&self, id: u64) -> Result<(), String> {
        unsafe {
            let hwnd = HWND(id as *mut core::ffi::c_void);
            let _ = ShowWindow(hwnd, SW_MINIMIZE);
        }
        Ok(())
    }

    fn close_window(&self, id: u64) -> Result<(), String> {
        unsafe {
            let hwnd = HWND(id as *mut core::ffi::c_void);
            let _ = PostMessageW(Some(hwnd), WM_CLOSE, WPARAM(0), LPARAM(0));
        }
        Ok(())
    }

    fn send_close_tab(&self, id: u64) -> Result<(), String> {
        self.focus_window(id)?;
        thread::sleep(Duration::from_millis(80));

        unsafe {
            let vk_w = VIRTUAL_KEY(0x57); // 'W'
            let inputs = [
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: VK_CONTROL,
                            wScan: 0,
                            dwFlags: Default::default(),
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                },
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: vk_w,
                            wScan: 0,
                            dwFlags: Default::default(),
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                },
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: vk_w,
                            wScan: 0,
                            dwFlags: KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                },
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: VK_CONTROL,
                            wScan: 0,
                            dwFlags: KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                },
            ];
            let sent = SendInput(&inputs, size_of::<INPUT>() as i32);
            if sent == 0 {
                return Err("SendInput Ctrl+W failed".into());
            }
        }
        thread::sleep(Duration::from_millis(120));
        Ok(())
    }
}
