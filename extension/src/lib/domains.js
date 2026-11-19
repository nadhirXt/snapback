/**
 * Pure domain & URL matching helpers for FocusGuard.
 * Zero browser dependencies so it can be unit-tested with `node --test`.
 */

/**
 * Normalizes a user-entered domain or URL into a clean lowercase hostname without `www.`.
 * Examples:
 *   "https://www.instagram.com/reels/?hl=fr" -> "instagram.com"
 *   "  DOCS.GOOGLE.COM/document/u/0/ "       -> "docs.google.com"
 *   "*.tiktok.com"                           -> "tiktok.com"
 *   "localhost:3000/app"                     -> "localhost"
 *
 * @param {string} input
 * @returns {string} normalized domain or "" if invalid
 */
export function normalizeDomain(input) {
  if (typeof input !== "string") return "";
  let cleaned = input.trim().toLowerCase();
  if (!cleaned) return "";

  // Strip wildcard prefix like *.example.com
  cleaned = cleaned.replace(/^\*\./, "");

  // Add protocol if missing so URL parser works reliably
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    host = host.replace(/\.+$/, "");
    if (!host) return "";
    // Reject obvious invalid hosts without a dot unless it's localhost or an IPv4
    const isLocalhost = host === "localhost";
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    const hasValidChars = /^[a-z0-9.-]+$/.test(host) && !host.startsWith("-") && !host.endsWith("-");
    if (!hasValidChars) return "";
    if (!isLocalhost && !isIp && !host.includes(".")) return "";
    return host;
  } catch {
    return "";
  }
}

/**
 * Extracts normalized hostname from a full browser URL.
 * Returns "" for internal browser pages (chrome://, brave://, chrome-extension://, about:).
 *
 * @param {string} rawUrl
 * @returns {string}
 */
export function extractHostname(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return "";
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    return host;
  } catch {
    return "";
  }
}

/**
 * Checks whether a hostname matches a target domain (including any subdomain).
 * Example:
 *   matchesDomain("m.instagram.com", "instagram.com") === true
 *   matchesDomain("instagram.com", "instagram.com") === true
 *   matchesDomain("notinstagram.com", "instagram.com") === false
 *
 * @param {string} hostname
 * @param {string} targetDomain
 * @returns {boolean}
 */
export function matchesDomain(hostname, targetDomain) {
  const normHost = normalizeDomain(hostname);
  const normTarget = normalizeDomain(targetDomain);
  if (!normHost || !normTarget) return false;
  if (normHost === normTarget) return true;
  return normHost.endsWith(`.${normTarget}`);
}

/**
 * Checks whether a hostname matches at least one domain in a list.
 *
 * @param {string} hostname
 * @param {string[]} domainList
 * @returns {string|null} the matched domain from the list, or null
 */
export function findMatchedDomain(hostname, domainList = []) {
  if (!Array.isArray(domainList) || !hostname) return null;
  for (const domain of domainList) {
    if (matchesDomain(hostname, domain)) {
      return normalizeDomain(domain);
    }
  }
  return null;
}

/**
 * Determines if a given URL should be blocked according to current mode and lists.
 * Note: A planned workSite is never blocked even in whitelist mode.
 *
 * @param {string} rawUrl
 * @param {{ mode: "blacklist" | "whitelist", blacklist: string[], whitelist: string[], workSites?: string[] }} config
 * @returns {{ blocked: boolean, matchedDomain: string | null }}
 */
export function shouldBlockUrl(rawUrl, { mode = "blacklist", blacklist = [], whitelist = [], workSites = [] } = {}) {
  const hostname = extractHostname(rawUrl);
  if (!hostname) {
    return { blocked: false, matchedDomain: null };
  }

  if (mode === "whitelist") {
    const allowedList = [...whitelist, ...workSites];
    const allowedMatch = findMatchedDomain(hostname, allowedList);
    if (allowedMatch) {
      return { blocked: false, matchedDomain: null };
    }
    return { blocked: true, matchedDomain: hostname };
  }

  // Default: blacklist mode
  const blockedMatch = findMatchedDomain(hostname, blacklist);
  if (blockedMatch) {
    return { blocked: true, matchedDomain: blockedMatch };
  }
  return { blocked: false, matchedDomain: null };
}

/**
 * Finds all open browser tabs that match the user's planned workSites,
 * and picks the best candidate tab for the "Boomerang" snap-back effect.
 *
 * Priority for best candidate:
 *   1. The tab matching `lastWorkTabId` (if still open and still on a workSite)
 *   2. Currently active work tab
 *   3. Most recently accessed work tab (by `lastAccessed` if available, else first in list)
 *
 * @param {Array<{ id: number, windowId?: number, url?: string, title?: string, active?: boolean, lastAccessed?: number }>} tabs
 * @param {string[]} workSites
 * @param {number|null} [lastWorkTabId]
 * @returns {{ openWorkTabs: Array<object>, bestWorkTab: object | null }}
 */
export function findMatchingWorkTab(tabs = [], workSites = [], lastWorkTabId = null) {
  if (!Array.isArray(tabs) || !Array.isArray(workSites) || workSites.length === 0) {
    return { openWorkTabs: [], bestWorkTab: null };
  }

  const openWorkTabs = [];
  for (const tab of tabs) {
    if (!tab || typeof tab.url !== "string") continue;
    const hostname = extractHostname(tab.url);
    if (!hostname) continue;
    const matchedWorkDomain = findMatchedDomain(hostname, workSites);
    if (matchedWorkDomain) {
      openWorkTabs.push({
        id: tab.id,
        windowId: tab.windowId ?? null,
        url: tab.url,
        title: tab.title || matchedWorkDomain,
        domain: matchedWorkDomain,
        active: Boolean(tab.active),
        lastAccessed: typeof tab.lastAccessed === "number" ? tab.lastAccessed : 0
      });
    }
  }

  if (openWorkTabs.length === 0) {
    return { openWorkTabs: [], bestWorkTab: null };
  }

  if (lastWorkTabId !== null) {
    const byLastId = openWorkTabs.find((t) => t.id === lastWorkTabId);
    if (byLastId) {
      return { openWorkTabs, bestWorkTab: byLastId };
    }
  }

  const activeTab = openWorkTabs.find((t) => t.active);
  if (activeTab) {
    return { openWorkTabs, bestWorkTab: activeTab };
  }

  const sorted = [...openWorkTabs].sort((a, b) => b.lastAccessed - a.lastAccessed);
  return { openWorkTabs, bestWorkTab: sorted[0] };
}
