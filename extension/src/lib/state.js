/**
 * Pure state, schedule, session lock, and statistics logic for SnapBack (Extension + Desktop).
 */

import { t } from "./i18n.js";

export const SUGGESTED_WORK_SITES = [
  "docs.google.com",
  "drive.google.com",
  "github.com",
  "notion.so",
  "figma.com",
  "localhost"
];

export const SUGGESTED_BLOCKED_SITES = [
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "facebook.com",
  "x.com",
  "reddit.com"
];

export const SUGGESTED_WORK_APPS = ["code", "soffice.bin", "obsidian", "alacritty", "gnome-terminal"];

export const SUGGESTED_BLOCKED_APPS = [
  { process: "discord", label: "Discord", kill: false },
  { process: "steam", label: "Steam", kill: false },
  { process: "telegram-desktop", label: "Telegram", kill: false },
  { process: "spotify", label: "Spotify", kill: false }
];

/**
 * Returns today's date key in local time: "YYYY-MM-DD".
 *
 * @param {Date} [now]
 * @returns {string}
 */
export function getLocalDateKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDefaultState(now = new Date()) {
  return {
    language: "auto", // "auto" | "fr" | "en"
    onboardingDismissed: false,
    mode: "blacklist", // "blacklist" | "whitelist"
    workSites: ["docs.google.com", "drive.google.com"],
    workApps: ["code", "soffice.bin"],
    blacklist: ["instagram.com", "tiktok.com"],
    whitelist: ["docs.google.com", "drive.google.com", "accounts.google.com"],
    blockedApps: [
      { process: "discord", label: "Discord", kill: false },
      { process: "steam", label: "Steam", kill: false }
    ],
    customKeywords: {},
    strictMode: false,
    autoTriggerEnabled: true,
    manualOn: false,
    sessionEndsAt: null, // timestamp in ms or null
    schedules: [
      {
        id: "default-workdays",
        enabled: false,
        days: [1, 2, 3, 4, 5],
        start: "09:00",
        end: "17:00"
      }
    ],
    lastWorkTab: null, // { id, windowId, title, domain, url }
    lastWorkWindow: null, // { id, title, processName, entry }
    stats: {
      date: getLocalDateKey(now),
      total: 0,
      perSite: {}
    }
  };
}

/**
 * Parses "HH:MM" into minutes from midnight (0..1439).
 *
 * @param {string} timeStr
 * @returns {number|null}
 */
export function parseTimeToMinutes(timeStr) {
  if (typeof timeStr !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Checks if a single schedule entry is active at a given Date.
 * Supports overnight ranges (e.g. 22:00 -> 02:00).
 *
 * @param {{ enabled?: boolean, days?: number[], start: string, end: string }} entry
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isScheduleEntryActive(entry, now = new Date()) {
  if (!entry || entry.enabled === false) return false;
  const days = Array.isArray(entry.days) ? entry.days : [];
  if (days.length === 0) return false;

  const startMin = parseTimeToMinutes(entry.start);
  const endMin = parseTimeToMinutes(entry.end);
  if (startMin === null || endMin === null || startMin === endMin) return false;

  const currentDay = now.getDay(); // 0 (Sun) .. 6 (Sat)
  const currentMin = now.getHours() * 60 + now.getMinutes();

  if (startMin < endMin) {
    return days.includes(currentDay) && currentMin >= startMin && currentMin < endMin;
  }

  const isLatePart = days.includes(currentDay) && currentMin >= startMin;
  const previousDay = (currentDay + 6) % 7;
  const isEarlyMorningPart = days.includes(previousDay) && currentMin < endMin;
  return isLatePart || isEarlyMorningPart;
}

/**
 * Checks if any schedule in the list is currently active.
 *
 * @param {Array<object>} schedules
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isScheduleActive(schedules = [], now = new Date()) {
  if (!Array.isArray(schedules)) return false;
  return schedules.some((entry) => isScheduleEntryActive(entry, now));
}

/**
 * Checks if a timed focus session is currently active.
 *
 * @param {{ sessionEndsAt?: number | null }} state
 * @param {number|Date} [now]
 * @returns {boolean}
 */
export function isSessionActive(state, now = Date.now()) {
  if (!state || typeof state.sessionEndsAt !== "number") return false;
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  return state.sessionEndsAt > nowMs;
}

/**
 * Checks if Work-Tab / Work-Window Auto-Trigger is active.
 *
 * @param {{ autoTriggerEnabled?: boolean }} state
 * @param {Array<object>} [openWorkTargets]
 * @returns {boolean}
 */
export function isAutoTriggerActive(state, openWorkTargets = []) {
  if (!state || !state.autoTriggerEnabled) return false;
  return Array.isArray(openWorkTargets) && openWorkTargets.length > 0;
}

/**
 * Checks if SnapBack blocking is active from any trigger source.
 *
 * @param {object} state
 * @param {Date} [now]
 * @param {Array<object>} [openWorkTargets]
 * @returns {boolean}
 */
export function isBlockingActive(state, now = new Date(), openWorkTargets = []) {
  if (!state) return false;
  return (
    Boolean(state.manualOn) ||
    isSessionActive(state, now) ||
    isScheduleActive(state.schedules, now) ||
    isAutoTriggerActive(state, openWorkTargets)
  );
}

/**
 * Checks if settings/lists are locked (true whenever a timed session is running).
 *
 * @param {object} state
 * @param {number|Date} [now]
 * @returns {boolean}
 */
export function isLocked(state, now = Date.now()) {
  return isSessionActive(state, now);
}

/**
 * Returns structured metadata about why blocking is active right now.
 *
 * @param {object} state
 * @param {Date} [now]
 * @param {Array<object>} [openWorkTargets]
 * @param {"fr" | "en"} [lang]
 * @returns {{ active: boolean, locked: boolean, source: "session" | "auto" | "schedule" | "manual" | "off", label: string, remainingMs: number }}
 */
export function getActivationStatus(state, now = new Date(), openWorkTargets = [], lang = "fr") {
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  const nowDate = now instanceof Date ? now : new Date(nowMs);

  if (isSessionActive(state, nowMs)) {
    const remainingMs = Math.max(0, state.sessionEndsAt - nowMs);
    const totalSec = Math.ceil(remainingMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = String(totalSec % 60).padStart(2, "0");
    return {
      active: true,
      locked: true,
      source: "session",
      label: t("status_session", lang, { time: `${min}:${sec}` }),
      remainingMs
    };
  }

  if (isAutoTriggerActive(state, openWorkTargets)) {
    const primary = openWorkTargets[0];
    const targetName = primary.domain || primary.entry || primary.processName || "work";
    return {
      active: true,
      locked: false,
      source: "auto",
      label: t("status_auto", lang, { domain: targetName }),
      remainingMs: 0
    };
  }

  if (isScheduleActive(state?.schedules, nowDate)) {
    return {
      active: true,
      locked: false,
      source: "schedule",
      label: t("status_schedule", lang),
      remainingMs: 0
    };
  }

  if (state?.manualOn) {
    return {
      active: true,
      locked: false,
      source: "manual",
      label: t("status_manual", lang),
      remainingMs: 0
    };
  }

  return {
    active: false,
    locked: false,
    source: "off",
    label: t("status_off", lang),
    remainingMs: 0
  };
}

/**
 * Updates daily statistics immutably when a distraction site or app is intercepted.
 * Automatically resets counters when the date changes.
 *
 * @param {{ date?: string, total?: number, perSite?: Record<string, number> }} stats
 * @param {string} targetName
 * @param {string} [todayKey]
 * @returns {{ date: string, total: number, perSite: Record<string, number> }}
 */
export function recordBlockedAttempt(stats, targetName, todayKey = getLocalDateKey()) {
  const cleanName = (targetName || "inconnu").toLowerCase();
  const baseStats =
    stats && stats.date === todayKey
      ? {
          date: todayKey,
          total: typeof stats.total === "number" ? stats.total : 0,
          perSite: { ...(stats.perSite || {}) }
        }
      : {
          date: todayKey,
          total: 0,
          perSite: {}
        };

  baseStats.total += 1;
  baseStats.perSite[cleanName] = (baseStats.perSite[cleanName] || 0) + 1;
  return baseStats;
}
