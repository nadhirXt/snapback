#![cfg(target_os = "linux")]

use super::{process_name_for_pid, Platform, WinInfo};
use x11rb::connection::Connection;
use x11rb::protocol::xproto::{
    AtomEnum, ClientMessageEvent, ConnectionExt, EventMask, InputFocus, Window,
    CLIENT_MESSAGE_EVENT,
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
        let ev = ClientMessageEvent::new(32, win, active_atom, [2, 0, 0, 0, 0]);
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
        let ev = ClientMessageEvent {
            response_type: CLIENT_MESSAGE_EVENT,
            format: 32,
            sequence: 0,
            window: win,
            type_: change_state,
            data: [3u32, 0, 0, 0, 0].into(),
        };
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
        // Verify that the distraction window is focused (or focus it) then send Ctrl+W via XTEST
        self.focus_window(id)?;
        std::thread::sleep(std::time::Duration::from_millis(45));

        let (conn, root) = self.connect()?;
        // Standard Linux X11 evdev keycodes: Left Control = 37, W = 25
        const KEYPRESS: u8 = 2;
        const KEYRELEASE: u8 = 3;
        const KEY_CTRL_L: u8 = 37;
        const KEY_W: u8 = 25;

        conn.xtest_fake_input(KEYPRESS, KEY_CTRL_L, 0, root, 0, 0, 0)
            .map_err(|e| e.to_string())?;
        conn.xtest_fake_input(KEYPRESS, KEY_W, 0, root, 0, 0, 0)
            .map_err(|e| e.to_string())?;
        conn.xtest_fake_input(KEYRELEASE, KEY_W, 0, root, 0, 0, 0)
            .map_err(|e| e.to_string())?;
        conn.xtest_fake_input(KEYRELEASE, KEY_CTRL_L, 0, root, 0, 0, 0)
            .map_err(|e| e.to_string())?;
        conn.flush().map_err(|e| e.to_string())?;
        Ok(())
    }
}
