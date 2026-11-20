/**
 * SnapBack Desktop Core Engine (Tauri 2 bridge + Browser fallback).
 */

import { classifyWindow, normalizeProcessName } from "./lib/matcher.js";
import {
  createDefaultState,
  getLocalDateKey,
  isBlockingActive,
  isLocked,
  getActivationStatus,
  recordBlockedAttempt
} from "./lib/state.js";
import { cleanDomainList } from "./lib/rules.js";
import { resolveLanguage } from "./lib/i18n.js";

const LOCAL_STORAGE_KEY = "snapback_desktop_state";
const GRACE_COOLDOWN_MS = 4000;

const MOCK_OPEN_WINDOWS = [
  { id: 101, processName: "code", title: "matcher.js — snapback — Visual Studio Code", pid: 4120 },
  { id: 102, processName: "firefox", title: "Architecture PFE - Google Docs — Mozilla Firefox", pid: 4310 },
  { id: 103, processName: "soffice.bin", title: "Rapport_Final.odt — LibreOffice Writer", pid: 4890 },
  { id: 104, processName: "discord", title: "#general | Discord", pid: 5120 },
  { id: 105, processName: "steam", title: "Steam", pid: 5340 }
];

export function isTauriEnv() {
  return Boolean(window.__TAURI__?.core?.invoke);
}

export async function tauriInvoke(cmd, args = {}) {
  if (isTauriEnv()) {
    return window.__TAURI__.core.invoke(cmd, args);
  }
  switch (cmd) {
    case "load_state": {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }
    case "save_state": {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(args.state));
      return null;
    }
    case "list_windows":
      return MOCK_OPEN_WINDOWS;
    case "active_window":
      return MOCK_OPEN_WINDOWS[0];
    default:
      return null;
  }
}

export async function tauriListen(eventName, handler) {
  if (window.__TAURI__?.event?.listen) {
    return window.__TAURI__.event.listen(eventName, (event) => handler(event.payload));
  }
  return () => {};
}

export class SnapBackDesktopEngine {
  constructor(onStateChange) {
    this.onStateChange = onStateChange;
    this.state = createDefaultState();
    this.openWindows = [];
    this.openWorkTargets = [];
    this.lastInterceptionAt = 0;
    this.pendingInterception = null;
  }

  getLang() {
    return resolveLanguage(this.state?.language, navigator.language || "fr");
  }

  async init() {
    const stored = await tauriInvoke("load_state");
    const defaults = createDefaultState();
    const todayKey = getLocalDateKey();

    if (stored && typeof stored === "object") {
      this.state = {
        ...defaults,
        ...stored,
        workSites: cleanDomainList(stored.workSites ?? defaults.workSites),
        workApps: Array.isArray(stored.workApps)
          ? stored.workApps.map(normalizeProcessName).filter(Boolean)
          : defaults.workApps,
        blacklist: cleanDomainList(stored.blacklist ?? defaults.blacklist),
        whitelist: cleanDomainList(stored.whitelist ?? defaults.whitelist),
        blockedApps: Array.isArray(stored.blockedApps) ? stored.blockedApps : defaults.blockedApps,
        stats:
          stored.stats && stored.stats.date === todayKey
            ? stored.stats
            : { date: todayKey, total: 0, perSite: {} }
      };
    } else {
      this.state = defaults;
      await this.save();
    }

    await this.refreshWindows();

    // Listen to OS active window changes from Rust watcher.rs
    await tauriListen("active-window-changed", (win) => {
      this.handleActiveWindow(win);
    });

    await tauriListen("tray-start-session", (minutes) => {
      this.startSession(Number(minutes) || 25);
    });

    // Native Rust thread emits overlay-complete after closing tab/app and focusing work window
    await tauriListen("overlay-complete", () => {
      this.pendingInterception = null;
      this.lastInterceptionAt = Date.now();
    });

    // Periodic tick for session timer and open windows scan
    setInterval(() => {
      this.tick();
    }, 2000);

    this.notifyUI();
  }

  async save() {
    await tauriInvoke("save_state", { state: this.state });
  }

  async refreshWindows() {
    const wins = (await tauriInvoke("list_windows")) || [];
    this.openWindows = wins;
    this.openWorkTargets = [];

    for (const w of wins) {
      const c = classifyWindow(w, this.state);
      if (c.kind === "work") {
        this.openWorkTargets.push({
          id: w.id,
          title: w.title,
          processName: w.processName,
          entry: c.entry
        });
      }
    }

    if (this.openWorkTargets.length > 0 && !this.state.lastWorkWindow) {
      this.state.lastWorkWindow = this.openWorkTargets[0];
    }
  }

  getStatus() {
    return getActivationStatus(this.state, new Date(), this.openWorkTargets, this.getLang());
  }

  notifyUI() {
    if (typeof this.onStateChange === "function") {
      this.onStateChange(this.state, this.getStatus(), this.openWindows, this.getLang());
    }
  }

  async tick() {
    if (typeof this.state.sessionEndsAt === "number" && this.state.sessionEndsAt <= Date.now()) {
      this.state.sessionEndsAt = null;
      await this.save();
    }
    await this.refreshWindows();
    this.notifyUI();
  }

  async handleActiveWindow(win) {
    if (!win || this.pendingInterception) return;
    const classification = classifyWindow(win, this.state);

    if (classification.kind === "work") {
      this.state.lastWorkWindow = {
        id: win.id,
        title: win.title,
        processName: win.processName,
        entry: classification.entry
      };
      await this.refreshWindows();
      await this.save();
      this.notifyUI();
      return;
    }

    if (
      classification.kind !== "distraction-site" &&
      classification.kind !== "distraction-app"
    ) {
      return;
    }

    const now = new Date();
    await this.refreshWindows();
    if (!isBlockingActive(this.state, now, this.openWorkTargets)) {
      return;
    }

    if (Date.now() - this.lastInterceptionAt < GRACE_COOLDOWN_MS) {
      return;
    }
    this.lastInterceptionAt = Date.now();

    const targetLabel =
      classification.kind === "distraction-site"
        ? classification.entry
        : classification.entry.label || classification.entry.process;

    this.state.stats = recordBlockedAttempt(this.state.stats, targetLabel, getLocalDateKey(now));
    await this.save();
    this.notifyUI();

    const returnTarget = this.state.lastWorkWindow || this.openWorkTargets[0] || null;
    const context = {
      isDemo: false,
      lang: this.getLang(),
      distractionKind: classification.kind,
      distractionWindowId: win.id,
      distractionProcess: win.processName,
      distractionLabel: targetLabel,
      shouldKill: Boolean(classification.entry?.kill),
      returnTarget,
      stats: this.state.stats
    };

    this.pendingInterception = context;
    // Safety reset in case overlay was closed manually
    setTimeout(() => {
      this.pendingInterception = null;
    }, 4500);

    // Rust show_overlay displays the 3s window AND schedules the native 3s close + focus execution
    await tauriInvoke("show_overlay", { payload: context });
  }

  async startSession(minutes) {
    this.state.sessionEndsAt = Date.now() + minutes * 60 * 1000;
    await this.save();
    this.notifyUI();
  }

  async setLanguage(language) {
    this.state.language = language;
    await this.save();
    this.notifyUI();
  }

  async setAutoTrigger(enabled) {
    if (isLocked(this.state) && !enabled) return false;
    this.state.autoTriggerEnabled = Boolean(enabled);
    await this.save();
    this.notifyUI();
    return true;
  }

  async setManualOn(enabled) {
    if (isLocked(this.state) && !enabled) return false;
    this.state.manualOn = Boolean(enabled);
    await this.save();
    this.notifyUI();
    return true;
  }

  async setStrictMode(enabled) {
    if (isLocked(this.state) && !enabled) return { ok: false, error: "Session locked" };
    try {
      await tauriInvoke("set_strict_mode", {
        domains: this.state.blacklist,
        enable: Boolean(enabled)
      });
      this.state.strictMode = Boolean(enabled);
      await this.save();
      this.notifyUI();
      return { ok: true };
    } catch (err) {
      this.notifyUI();
      return { ok: false, error: String(err) };
    }
  }
}
