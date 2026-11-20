#![cfg(target_os = "linux")]

use super::{process_name_for_pid, Platform, WinInfo};
use std::thread;
use std::time::Duration;
use x11rb::connection::Connection;
use x11rb::protocol::xproto::{
    AtomEnum, ClientMessageEvent, ConnectionExt, EventMask, InputFocus, Window,
};
use x11rb::protocol::xtest::ConnectionExt as XTestExt;
use x11rb::rust_connection::RustConnection;

pub struct LinuxX11Platform;

impl LinuxX11Platform {
    pub fn new() -> Self {
        Self
    }

    fn connect(&self) -> Result<(RustConnection, Window), String> {
        let (conn, screen_num) =
            RustConnection::connect(None).map_err(|e| format!("X11 connect failed: {e}"))?;
        let root = conn.setup().roots[screen_num].root;
        Ok((conn, root))
    }

    fn intern(&self, conn: &RustConnection, name: &[u8]) -> Result<u32, String> {
        conn.intern_atom(false, name)
            .map_err(|e| e.to_string())?
            .reply()
            .map(|r| r.atom)
            .map_err(|e| e.to_string())
    }

    /// Dynamically resolves an X11 keysym (e.g. 'w' = 0x0077, Control_L = 0xffe3)
    /// into the active X server's physical keycode so AZERTY, QWERTY, QWERTZ all work.
    fn keycode_for_keysym(&self, conn: &RustConnection, target_sym: u32, fallback: u8) -> u8 {
        let min_kc = conn.setup().min_keycode;
        let max_kc = conn.setup().max_keycode;
        if max_kc < min_kc {
            return fallback;
        }
        let count = max_kc - min_kc + 1;
        if let Ok(cookie) = conn.get_keyboard_mapping(min_kc, count) {
            if let Ok(reply) = cookie.reply() {
                let per = reply.keysyms_per_keycode as usize;
                if per > 0 {
                    for (idx, chunk) in reply.keysyms.chunks(per).enumerate() {
                        if chunk.contains(&target_sym) {
                            return min_kc.wrapping_add(idx as u8);
                        }
                    }
                }
            }
        }
        fallback
    }

    fn read_window_title(&self, conn: &RustConnection, win: Window) -> String {
        if let Ok(net_wm_name) = self.intern(conn, b"_NET_WM_NAME") {
            if let Ok(utf8_string) = self.intern(conn, b"UTF8_STRING") {
                if let Ok(cookie) = conn.get_property(false, win, net_wm_name, utf8_string, 0, 1024)
                {
                    if let Ok(reply) = cookie.reply() {
                        if !reply.value.is_empty() {
                            return String::from_utf8_lossy(&reply.value).trim().to_string();
                        }
                    }
                }
            }
        }
        if let Ok(cookie) =
            conn.get_property(false, win, AtomEnum::WM_NAME, AtomEnum::STRING, 0, 1024)
        {
            if let Ok(reply) = cookie.reply() {
                if !reply.value.is_empty() {
                    return String::from_utf8_lossy(&reply.value).trim().to_string();
                }
            }
        }
        String::new()
    }

    fn read_window_pid(&self, conn: &RustConnection, win: Window) -> u32 {
        if let Ok(net_wm_pid) = self.intern(conn, b"_NET_WM_PID") {
            if let Ok(cookie) =
                conn.get_property(false, win, net_wm_pid, AtomEnum::CARDINAL, 0, 1)
            {
                if let Ok(reply) = cookie.reply() {
                    if let Some(mut val32) = reply.value32() {
                        if let Some(pid) = val32.next() {
                            return pid;
                        }
                    }
                }
            }
        }
        0
    }

    fn build_win_info(&self, conn: &RustConnection, win: Window) -> Option<WinInfo> {
        if win == 0 {
            return None;
        }
        let title = self.read_window_title(conn, win);
        if title.is_empty() {
            return None;
        }
        let pid = self.read_window_pid(conn, win);
        let process_name = process_name_for_pid(pid);
        Some(WinInfo {
            id: win as u64,
            title,
            pid,
            process_name,
        })
    }

    fn wait_until_active(&self, target_id: u64, max_attempts: usize) {
        for _ in 0..max_attempts {
            if let Some(active) = self.active_window() {
                if active.id == target_id {
                    return;
                }
            }
            let _ = self.focus_window(target_id);
            thread::sleep(Duration::from_millis(35));
        }
    }
}

impl Platform for LinuxX11Platform {
    fn active_window(&self) -> Option<WinInfo> {
        let (conn, root) = self.connect().ok()?;
        let active_atom = self.intern(&conn, b"_NET_ACTIVE_WINDOW").ok()?;
        let reply = conn
            .get_property(false, root, active_atom, AtomEnum::WINDOW, 0, 1)
            .ok()?
            .reply()
            .ok()?;
        let win = reply.value32()?.next()?;
        self.build_win_info(&conn, win)
    }

    fn list_windows(&self) -> Vec<WinInfo> {
        let mut results = Vec::new();
        let Ok((conn, root)) = self.connect() else {
            return results;
        };
        let Ok(client_list_atom) = self.intern(&conn, b"_NET_CLIENT_LIST") else {
            return results;
        };
        let Ok(cookie) = conn.get_property(false, root, client_list_atom, AtomEnum::WINDOW, 0, 256)
        else {
            return results;
        };
        let Ok(reply) = cookie.reply() else {
            return results;
        };
        if let Some(windows) = reply.value32() {
            for win in windows {
                if let Some(info) = self.build_win_info(&conn, win) {
                    results.push(info);
                }
            }
        }
        results
    }

    fn focus_window(&self, id: u64) -> Result<(), String> {
        let (conn, root) = self.connect()?;
        let win = id as Window;
        let active_atom = self.intern(&conn, b"_NET_ACTIVE_WINDOW")?;
        let ev = ClientMessageEvent::new(32, win, active_atom, [2u32, 0, 0, 0, 0]);
        conn.send_event(
            false,
            root,
            EventMask::SUBSTRUCTURE_REDIRECT | EventMask::SUBSTRUCTURE_NOTIFY,
            ev,
        )
        .map_err(|e| e.to_string())?;
        let _ = conn.set_input_focus(InputFocus::PARENT, win, x11rb::CURRENT_TIME);
        conn.flush().map_err(|e| e.to_string())?;
        Ok(())
    }

    fn minimize_window(&self, id: u64) -> Result<(), String> {
        let (conn, root) = self.connect()?;
        let win = id as Window;
        let change_state = self.intern(&conn, b"WM_CHANGE_STATE")?;
        // IconicState = 3
        let ev = ClientMessageEvent::new(32, win, change_state, [3u32, 0, 0, 0, 0]);
        conn.send_event(
            false,
            root,
            EventMask::SUBSTRUCTURE_REDIRECT | EventMask::SUBSTRUCTURE_NOTIFY,
            ev,
        )
        .map_err(|e| e.to_string())?;
        conn.flush().map_err(|e| e.to_string())?;
        Ok(())
    }

    fn close_window(&self, id: u64) -> Result<(), String> {
        let (conn, root) = self.connect()?;
        let win = id as Window;
        let close_atom = self.intern(&conn, b"_NET_CLOSE_WINDOW")?;
        let ev = ClientMessageEvent::new(32, win, close_atom, [0u32, 2, 0, 0, 0]);
        conn.send_event(
            false,
            root,
            EventMask::SUBSTRUCTURE_REDIRECT | EventMask::SUBSTRUCTURE_NOTIFY,
            ev,
        )
        .map_err(|e| e.to_string())?;
        conn.flush().map_err(|e| e.to_string())?;
        Ok(())
    }

    fn send_close_tab(&self, id: u64) -> Result<(), String> {
        // Ensure the browser window actually regains focus after the overlay hides
        self.wait_until_active(id, 8);
        thread::sleep(Duration::from_millis(60));

        let (conn, root) = self.connect()?;
        // Resolve physical keycodes dynamically from X11 keyboard mapping (supports AZERTY & QWERTY)
        // XK_Control_L = 0xffe3, XK_w = 0x0077, XK_W = 0x0057
        let kc_ctrl = self.keycode_for_keysym(&conn, 0xffe3, 37);
        let mut kc_w = self.keycode_for_keysym(&conn, 0x0077, 0);
        if kc_w == 0 {
            kc_w = self.keycode_for_keysym(&conn, 0x0057, 25);
        }

        const KEYPRESS: u8 = 2;
        const KEYRELEASE: u8 = 3;

        conn.xtest_fake_input(KEYPRESS, kc_ctrl, 0, root, 0, 0, 0)
            .map_err(|e| e.to_string())?;
        conn.flush().map_err(|e| e.to_string())?;
        thread::sleep(Duration::from_millis(20));

        conn.xtest_fake_input(KEYPRESS, kc_w, 0, root, 0, 0, 0)
            .map_err(|e| e.to_string())?;
        conn.flush().map_err(|e| e.to_string())?;
        thread::sleep(Duration::from_millis(20));

        conn.xtest_fake_input(KEYRELEASE, kc_w, 0, root, 0, 0, 0)
            .map_err(|e| e.to_string())?;
        conn.xtest_fake_input(KEYRELEASE, kc_ctrl, 0, root, 0, 0, 0)
            .map_err(|e| e.to_string())?;
        conn.flush().map_err(|e| e.to_string())?;

        // Give the browser 120ms to process Ctrl+W and close the tab before SnapBack switches window focus
        thread::sleep(Duration::from_millis(120));
        Ok(())
    }
}
