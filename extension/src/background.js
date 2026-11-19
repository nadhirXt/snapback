import {
  normalizeDomain,
  extractHostname,
  shouldBlockUrl,
  findMatchingWorkTab
} from "./lib/domains.js";
import {
  createDefaultState,
  getLocalDateKey,
  isBlockingActive,
  isLocked,
  getActivationStatus,
  recordBlockedAttempt
} from "./lib/state.js";
import { buildRules, cleanDomainList } from "./lib/rules.js";
import { resolveLanguage } from "./lib/i18n.js";

const STORAGE_KEY = "focusguard_state";
const ALARM_TICK = "focusguard-tick";
const ALARM_SESSION_END = "focusguard-session-end";

/**
 * Loads current state from chrome.storage.local, merging with defaults if needed.
 */
async function loadState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const defaults = createDefaultState();
  const current = stored[STORAGE_KEY] || {};
  const todayKey = getLocalDateKey();

  const stats =
    current.stats && current.stats.date === todayKey
      ? current.stats
      : { date: todayKey, total: 0, perSite: {} };

  return {
    ...defaults,
    ...current,
    language: current.language || defaults.language,
    onboardingDismissed: Boolean(current.onboardingDismissed),
    workSites: cleanDomainList(current.workSites ?? defaults.workSites),
    blacklist: cleanDomainList(current.blacklist ?? defaults.blacklist),
    whitelist: cleanDomainList(current.whitelist ?? defaults.whitelist),
    schedules: Array.isArray(current.schedules) ? current.schedules : defaults.schedules,
    stats
  };
}

/**
 * Persists state to chrome.storage.local.
 */
async function saveState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function getEffectiveLang(state) {
  const uiLang =
    typeof chrome?.i18n?.getUILanguage === "function"
      ? chrome.i18n.getUILanguage()
      : navigator?.language || "fr";
  return resolveLanguage(state?.language, uiLang);
}

/**
 * Updates toolbar badge according to current activation status.
 */
async function updateBadge(status) {
  if (!status.active) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  const badgeMap = {
    session: { text: "LOCK", color: "#4cc38a" },
    auto: { text: "AUTO", color: "#4cc38a" },
    schedule: { text: "PLAN", color: "#4cc38a" },
    manual: { text: "ON", color: "#4cc38a" }
  };
  const cfg = badgeMap[status.source] || { text: "ON", color: "#4cc38a" };
  await chrome.action.setBadgeText({ text: cfg.text });
  await chrome.action.setBadgeBackgroundColor({ color: cfg.color });
}

/**
 * Main synchronization loop.
 */
async function refreshEngine(stateOverride = null) {
  const state = stateOverride || (await loadState());
  const now = new Date();
  let stateChanged = false;

  if (typeof state.sessionEndsAt === "number" && state.sessionEndsAt <= now.getTime()) {
    state.sessionEndsAt = null;
    stateChanged = true;
  }

  const allTabs = await chrome.tabs.query({});
  const { openWorkTabs, bestWorkTab } = findMatchingWorkTab(
    allTabs,
    state.workSites,
    state.lastWorkTab?.id ?? null
  );

  if (bestWorkTab) {
    const prev = state.lastWorkTab;
    if (
      !prev ||
      prev.id !== bestWorkTab.id ||
      prev.title !== bestWorkTab.title ||
      prev.domain !== bestWorkTab.domain
    ) {
      state.lastWorkTab = bestWorkTab;
      stateChanged = true;
    }
  } else if (state.lastWorkTab !== null) {
    state.lastWorkTab = null;
    stateChanged = true;
  }

  if (stateChanged) {
    await saveState(state);
  }

  const lang = getEffectiveLang(state);
  const active = isBlockingActive(state, now, openWorkTabs);
  const status = getActivationStatus(state, now, openWorkTabs, lang);
  await updateBadge(status);

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((r) => r.id);
  const addRules = buildRules({
    active,
    mode: state.mode,
    blacklist: state.blacklist,
    whitelist: state.whitelist,
    workSites: state.workSites,
    extensionId: chrome.runtime.id
  });

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules
  });

  if (active) {
    const blockedPagePrefix = chrome.runtime.getURL("src/blocked.html");
    for (const tab of allTabs) {
      if (!tab.id || !tab.url || tab.url.startsWith(blockedPagePrefix)) continue;
      const check = shouldBlockUrl(tab.url, state);
      if (check.blocked) {
        const redirectUrl = `${blockedPagePrefix}#${tab.url}`;
        try {
          await chrome.tabs.update(tab.id, { url: redirectUrl });
        } catch {
          // Tab might have closed concurrently
        }
      }
    }
  }

  return { state, status, openWorkTabs, bestWorkTab, lang };
}

/**
 * Executes the Boomerang action when the 3-second countdown completes.
 * Supports `isDemo` mode (returns focus to the options.html tab that launched the demo).
 */
async function executeBoomerangClose(senderTab, isDemo = false) {
  const state = await loadState();
  const allTabs = await chrome.tabs.query({});
  const senderTabId = senderTab?.id ?? null;
  const senderWindowId = senderTab?.windowId ?? null;

  if (isDemo) {
    const optionsPrefix = chrome.runtime.getURL("src/options.html");
    const optionsTab = allTabs.find(
      (t) => t.id !== senderTabId && typeof t.url === "string" && t.url.startsWith(optionsPrefix)
    );
    if (optionsTab?.id) {
      try {
        await chrome.tabs.update(optionsTab.id, { active: true });
        if (optionsTab.windowId) {
          await chrome.windows.update(optionsTab.windowId, { focused: true });
        }
      } catch {
        // Ignore
      }
    }
    if (senderTabId) {
      try {
        await chrome.tabs.remove(senderTabId);
      } catch {
        // Ignore
      }
    }
    return { action: "demo-completed" };
  }

  const { bestWorkTab } = findMatchingWorkTab(
    allTabs.filter((t) => t.id !== senderTabId),
    state.workSites,
    state.lastWorkTab?.id ?? null
  );

  if (bestWorkTab && bestWorkTab.id) {
    try {
      await chrome.tabs.update(bestWorkTab.id, { active: true });
      if (bestWorkTab.windowId) {
        await chrome.windows.update(bestWorkTab.windowId, { focused: true });
      }
    } catch {
      // Fallback if work tab closed
    }

    if (senderTabId) {
      try {
        await chrome.tabs.remove(senderTabId);
      } catch {
        // Ignore if already closed
      }
    }
    return { action: "focused-work-tab", target: bestWorkTab };
  }

  if (senderTabId) {
    const windowTabs = allTabs.filter((t) => t.windowId === senderWindowId);
    if (windowTabs.length <= 1) {
      const fallbackUrl =
        state.workSites.length > 0 ? `https://${state.workSites[0]}` : "chrome://newtab";
      try {
        await chrome.tabs.update(senderTabId, { url: fallbackUrl });
        return { action: "redirected-sole-tab", url: fallbackUrl };
      } catch {
        // Ignore
      }
    } else {
      try {
        await chrome.tabs.remove(senderTabId);
        return { action: "closed-tab" };
      } catch {
        // Ignore
      }
    }
  }

  return { action: "noop" };
}

// Lifecycle listeners
chrome.runtime.onInstalled.addListener(async (details) => {
  const state = await loadState();
  await saveState(state);
  await chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 });
  await refreshEngine(state);

  if (details?.reason === "install") {
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL("src/options.html?welcome=1")
      });
    } catch {
      // Fail-safe if tabs cannot open
    }
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 });
  await refreshEngine();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_SESSION_END) {
    const state = await loadState();
    state.sessionEndsAt = null;
    await saveState(state);
    const { lang } = await refreshEngine(state);
    try {
      await chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icons/icon128.png"),
        title: lang === "en" ? "SnapBack — Session complete" : "SnapBack — Session terminée",
        message:
          lang === "en"
            ? "Your locked focus session is finished."
            : "Ta session de concentration verrouillée est terminée."
      });
    } catch {
      // Notifications permission optional fail-safe
    }
    return;
  }

  if (alarm.name === ALARM_TICK) {
    await refreshEngine();
  }
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url || changeInfo.title) {
    const state = await loadState();
    const hostname = extractHostname(tab.url || "");
    if (hostname && state.workSites.some((w) => hostname === w || hostname.endsWith(`.${w}`))) {
      state.lastWorkTab = {
        id: tab.id,
        windowId: tab.windowId,
        url: tab.url,
        title: tab.title || hostname,
        domain: hostname
      };
      await saveState(state);
    }
    await refreshEngine(state);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    const state = await loadState();
    const hostname = extractHostname(tab.url || "");
    if (hostname && state.workSites.some((w) => hostname === w || hostname.endsWith(`.${w}`))) {
      state.lastWorkTab = {
        id: tab.id,
        windowId: tab.windowId,
        url: tab.url,
        title: tab.title || hostname,
        domain: hostname
      };
      await saveState(state);
    }
    await refreshEngine(state);
  } catch {
    await refreshEngine();
  }
});

chrome.tabs.onRemoved.addListener(async () => {
  await refreshEngine();
});

// Message API
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const state = await loadState();
    const now = new Date();

    switch (message?.type) {
      case "GET_STATUS": {
        const { status, openWorkTabs, bestWorkTab, lang } = await refreshEngine(state);
        sendResponse({
          ok: true,
          state,
          status,
          openWorkTabs,
          bestWorkTab,
          lang
        });
        break;
      }

      case "SET_LANGUAGE": {
        if (["auto", "fr", "en"].includes(message.language)) {
          state.language = message.language;
          await saveState(state);
        }
        const { status, openWorkTabs, bestWorkTab, lang } = await refreshEngine(state);
        sendResponse({ ok: true, state, status, openWorkTabs, bestWorkTab, lang });
        break;
      }

      case "DISMISS_ONBOARDING": {
        state.onboardingDismissed = true;
        await saveState(state);
        const { status, openWorkTabs, bestWorkTab, lang } = await refreshEngine(state);
        sendResponse({ ok: true, state, status, openWorkTabs, bestWorkTab, lang });
        break;
      }

      case "START_SESSION": {
        const minutes = Number(message.minutes) || 25;
        const endsAt = Date.now() + minutes * 60 * 1000;
        state.sessionEndsAt = endsAt;
        await saveState(state);
        await chrome.alarms.create(ALARM_SESSION_END, { when: endsAt });
        const { status, openWorkTabs, bestWorkTab, lang } = await refreshEngine(state);
        sendResponse({ ok: true, state, status, openWorkTabs, bestWorkTab, lang });
        break;
      }

      case "SET_MANUAL": {
        if (isLocked(state, now) && !message.manualOn) {
          sendResponse({
            ok: false,
            error: "Locked session running"
          });
          break;
        }
        state.manualOn = Boolean(message.manualOn);
        await saveState(state);
        const { status, openWorkTabs, bestWorkTab, lang } = await refreshEngine(state);
        sendResponse({ ok: true, state, status, openWorkTabs, bestWorkTab, lang });
        break;
      }

      case "SET_AUTO_TRIGGER": {
        if (isLocked(state, now) && !message.autoTriggerEnabled) {
          sendResponse({
            ok: false,
            error: "Locked session running"
          });
          break;
        }
        state.autoTriggerEnabled = Boolean(message.autoTriggerEnabled);
        await saveState(state);
        const { status, openWorkTabs, bestWorkTab, lang } = await refreshEngine(state);
        sendResponse({ ok: true, state, status, openWorkTabs, bestWorkTab, lang });
        break;
      }

      case "UPDATE_PLAN": {
        if (isLocked(state, now)) {
          sendResponse({
            ok: false,
            error: "Locked session running"
          });
          break;
        }
        if (typeof message.mode === "string" && ["blacklist", "whitelist"].includes(message.mode)) {
          state.mode = message.mode;
        }
        if (Array.isArray(message.workSites)) {
          state.workSites = cleanDomainList(message.workSites);
        }
        if (Array.isArray(message.blacklist)) {
          state.blacklist = cleanDomainList(message.blacklist);
        }
        if (Array.isArray(message.whitelist)) {
          state.whitelist = cleanDomainList(message.whitelist);
        }
        if (typeof message.autoTriggerEnabled === "boolean") {
          state.autoTriggerEnabled = message.autoTriggerEnabled;
        }
        if (Array.isArray(message.schedules)) {
          state.schedules = message.schedules;
        }
        await saveState(state);
        const { status, openWorkTabs, bestWorkTab, lang } = await refreshEngine(state);
        sendResponse({ ok: true, state, status, openWorkTabs, bestWorkTab, lang });
        break;
      }

      case "QUICK_ADD_DOMAIN": {
        const listName = message.listName;
        const domain = normalizeDomain(message.domain || "");
        if (!domain || !["workSites", "blacklist", "whitelist"].includes(listName)) {
          sendResponse({ ok: false, error: "Invalid domain" });
          break;
        }
        state[listName] = cleanDomainList([...(state[listName] || []), domain]);
        await saveState(state);
        const { status, openWorkTabs, bestWorkTab, lang } = await refreshEngine(state);
        sendResponse({ ok: true, domain, state, status, openWorkTabs, bestWorkTab, lang });
        break;
      }

      case "QUICK_REMOVE_DOMAIN": {
        if (isLocked(state, now)) {
          sendResponse({
            ok: false,
            error: "Locked session running"
          });
          break;
        }
        const listName = message.listName;
        const domain = normalizeDomain(message.domain || "");
        if (!["workSites", "blacklist", "whitelist"].includes(listName)) {
          sendResponse({ ok: false, error: "Invalid list" });
          break;
        }
        state[listName] = (state[listName] || []).filter((d) => d !== domain);
        await saveState(state);
        const { status, openWorkTabs, bestWorkTab, lang } = await refreshEngine(state);
        sendResponse({ ok: true, state, status, openWorkTabs, bestWorkTab, lang });
        break;
      }

      case "RECORD_BLOCK_AND_GET_CONTEXT": {
        const rawUrl = message.blockedUrl || "";
        const isDemo = Boolean(message.isDemo);
        const hostname = extractHostname(rawUrl) || normalizeDomain(rawUrl) || "instagram.com";

        if (!isDemo) {
          state.stats = recordBlockedAttempt(state.stats, hostname, getLocalDateKey(now));
          await saveState(state);
        }

        const allTabs = await chrome.tabs.query({});
        const { bestWorkTab } = findMatchingWorkTab(
          allTabs,
          state.workSites,
          state.lastWorkTab?.id ?? null
        );

        sendResponse({
          ok: true,
          isDemo,
          lang: getEffectiveLang(state),
          blockedDomain: hostname,
          stats: state.stats,
          bestWorkTab,
          workSites: state.workSites
        });
        break;
      }

      case "BOOMERANG_CLOSE": {
        const result = await executeBoomerangClose(sender?.tab, Boolean(message.isDemo));
        sendResponse({ ok: true, ...result });
        break;
      }

      default:
        sendResponse({ ok: false, error: "Unknown command" });
    }
  })();
  return true;
});
