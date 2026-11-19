/**
 * Pure window & process classifier for SnapBack Desktop (Linux X11 & Windows Win32).
 * Detects planned work sites, distracting sites across all browsers, work apps, and distracting apps.
 */

import { normalizeDomain } from "./domains.js";

export const BROWSER_PROCESSES = [
  "firefox",
  "firefox-esr",
  "firefox-bin",
  "chrome",
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
  "brave",
  "brave-browser",
  "msedge",
  "microsoft-edge",
  "opera",
  "vivaldi",
  "vivaldi-bin",
  "zen",
  "librewolf",
  "waterfox"
];

export const TITLE_KEYWORDS = {
  "instagram.com": ["instagram"],
  "youtube.com": ["youtube"],
  "tiktok.com": ["tiktok"],
  "facebook.com": ["facebook"],
  "reddit.com": ["reddit"],
  "x.com": [" / x", " on x", "twitter"],
  "twitter.com": ["twitter", " / x"],
  "netflix.com": ["netflix"],
  "twitch.tv": ["twitch"],
  "docs.google.com": ["google docs", "docs.google.com"],
  "drive.google.com": ["google drive", "drive.google.com"],
  "github.com": ["github"],
  "gitlab.com": ["gitlab"],
  "notion.so": ["notion"],
  "figma.com": ["figma"],
  "localhost": ["localhost", "127.0.0.1"]
};

/**
 * Normalizes a process name across Linux and Windows (strips path and `.exe`).
 *
 * @param {string} processName
 * @returns {string}
 */
export function normalizeProcessName(processName) {
  if (typeof processName !== "string") return "";
  const base = processName
    .trim()
    .toLowerCase()
    .split(/[/\\]/)
    .pop();
  return (base || "").replace(/\.exe$/i, "");
}

/**
 * Checks whether a process name belongs to a known web browser.
 *
 * @param {string} processName
 * @returns {boolean}
 */
export function isBrowserProcess(processName) {
  const norm = normalizeProcessName(processName);
  if (!norm) return false;
  return BROWSER_PROCESSES.some((b) => norm === b || norm.startsWith(`${b}-`));
}

/**
 * Returns lowercase search keywords for a given domain so browser window titles can be matched.
 *
 * @param {string} domain
 * @param {Record<string, string[]>} [customKeywords]
 * @returns {string[]}
 */
export function keywordsForDomain(domain, customKeywords = {}) {
  const norm = normalizeDomain(domain);
  if (!norm) return [];

  if (customKeywords && Array.isArray(customKeywords[norm]) && customKeywords[norm].length > 0) {
    return customKeywords[norm].map((k) => String(k).toLowerCase().trim()).filter(Boolean);
  }

  if (TITLE_KEYWORDS[norm]) {
    return TITLE_KEYWORDS[norm];
  }

  // Fallback: extract primary brand label from hostname (e.g. "coursera.org" -> ["coursera.org", "coursera"])
  const parts = norm.split(".");
  const mainLabel = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  const set = new Set([norm]);
  if (mainLabel && mainLabel.length >= 3) {
    set.add(mainLabel);
  }
  return Array.from(set);
}

/**
 * Checks if a browser window title matches a domain's keywords.
 *
 * @param {string} title
 * @param {string} domain
 * @param {Record<string, string[]>} [customKeywords]
 * @returns {boolean}
 */
export function titleMatchesDomain(title, domain, customKeywords = {}) {
  if (typeof title !== "string" || !title.trim()) return false;
  const lowerTitle = title.toLowerCase();
  const keywords = keywordsForDomain(domain, customKeywords);
  return keywords.some((kw) => lowerTitle.includes(kw));
}

/**
 * Classifies an OS window (`{ id, processName, title }`) against user state.
 *
 * Safety priority:
 *   1. Work App (`state.workApps`) -> `{ kind: "work", source: "app", entry }`
 *   2. Browser Window matching a Work Site (`state.workSites`) -> `{ kind: "work", source: "site", entry }`
 *   3. Distracting App (`state.blockedApps`) -> `{ kind: "distraction-app", entry }`
 *   4. Browser Window matching a Blocked Site (`state.blacklist` or outside `whitelist`) -> `{ kind: "distraction-site", entry }`
 *   5. Otherwise -> `{ kind: "neutral", entry: null }`
 *
 * Notice that step 2 runs BEFORE step 4: a document titled "Instagram Marketing — Google Docs"
 * matches `docs.google.com` first and is safely classified as `work`.
 *
 * @param {{ id?: number, processName?: string, title?: string }} win
 * @param {object} state
 * @returns {{ kind: "work" | "distraction-site" | "distraction-app" | "neutral", source?: "app" | "site", entry: any }}
 */
export function classifyWindow(win, state = {}) {
  if (!win) return { kind: "neutral", entry: null };
  const proc = normalizeProcessName(win.processName || "");
  const title = typeof win.title === "string" ? win.title : "";

  // Ignore SnapBack's own windows
  if (proc === "snapback" || proc === "snapback-desktop" || title.includes("SnapBack")) {
    return { kind: "neutral", entry: null };
  }

  const workApps = Array.isArray(state.workApps) ? state.workApps : [];
  const workSites = Array.isArray(state.workSites) ? state.workSites : [];
  const blockedApps = Array.isArray(state.blockedApps) ? state.blockedApps : [];
  const blacklist = Array.isArray(state.blacklist) ? state.blacklist : [];
  const customKeywords = state.customKeywords || {};

  // 1. Check planned work applications
  for (const app of workApps) {
    const targetProc = normalizeProcessName(typeof app === "string" ? app : app?.process || "");
    if (targetProc && proc === targetProc) {
      return { kind: "work", source: "app", entry: targetProc };
    }
  }

  const browser = isBrowserProcess(proc);

  // 2. Check planned work sites inside browsers (evaluated BEFORE blocked sites to prevent false positives)
  if (browser && title) {
    for (const site of workSites) {
      if (titleMatchesDomain(title, site, customKeywords)) {
        return { kind: "work", source: "site", entry: normalizeDomain(site) };
      }
    }
  }

  // 3. Check distracting desktop applications
  for (const app of blockedApps) {
    const appObj =
      typeof app === "string"
        ? { process: normalizeProcessName(app), label: app, kill: false }
        : {
            process: normalizeProcessName(app?.process || ""),
            label: app?.label || app?.process || "",
            kill: Boolean(app?.kill)
          };
    if (appObj.process && proc === appObj.process) {
      return { kind: "distraction-app", entry: appObj };
    }
  }

  // 4. Check distracting sites inside browsers
  if (browser && title) {
    for (const site of blacklist) {
      if (titleMatchesDomain(title, site, customKeywords)) {
        return { kind: "distraction-site", entry: normalizeDomain(site) };
      }
    }
  }

  return { kind: "neutral", entry: null };
}
