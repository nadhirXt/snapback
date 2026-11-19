import { extractHostname, normalizeDomain } from "./lib/domains.js";
import { applyDomTranslations, t } from "./lib/i18n.js";

const DISABLE_DELAY_SECONDS = 30;
let delayInterval = null;
let currentTabHostname = "";
let latestState = null;
let latestStatus = null;
let activeLang = "fr";

function renderTags(container, domains, type, locked, listName) {
  container.innerHTML = "";
  if (!Array.isArray(domains) || domains.length === 0) {
    const empty = document.createElement("span");
    empty.style.color = "#85858b";
    empty.style.fontSize = "12px";
    empty.textContent = t("popup_no_domain", activeLang);
    container.appendChild(empty);
    return;
  }

  for (const domain of domains) {
    const tag = document.createElement("span");
    tag.className = `tag ${type}`;
    const label = document.createElement("span");
    label.textContent = domain;
    tag.appendChild(label);

    const btnRemove = document.createElement("button");
    btnRemove.type = "button";
    btnRemove.textContent = "×";
    btnRemove.disabled = locked;
    btnRemove.title = domain;
    btnRemove.addEventListener("click", async () => {
      const res = await chrome.runtime.sendMessage({
        type: "QUICK_REMOVE_DOMAIN",
        listName,
        domain
      });
      if (res?.ok) {
        updateUI(res.state, res.status, res.lang);
      }
    });
    tag.appendChild(btnRemove);
    container.appendChild(tag);
  }
}

function updateUI(state, status, lang = activeLang) {
  latestState = state;
  latestStatus = status;
  if (lang) activeLang = lang;

  applyDomTranslations(document, activeLang);
  const langBtn = document.getElementById("btn-toggle-lang");
  if (langBtn) {
    langBtn.textContent = activeLang.toUpperCase();
  }

  if (!currentTabHostname) {
    document.getElementById("current-tab-domain").textContent = t("popup_system_tab", activeLang);
  }

  const banner = document.getElementById("status-banner");
  const label = document.getElementById("status-label");
  banner.classList.remove("active", "locked");
  if (status.locked) {
    banner.classList.add("locked");
  } else if (status.active) {
    banner.classList.add("active");
  }
  label.textContent = status.label;

  const chkAuto = document.getElementById("chk-auto-trigger");
  const chkManual = document.getElementById("chk-manual-on");
  chkAuto.checked = Boolean(state.autoTriggerEnabled);
  chkManual.checked = Boolean(state.manualOn);
  chkAuto.disabled = status.locked;
  chkManual.disabled = status.locked;

  // Update Live Boomerang Circuit preview
  const workPreviewEl = document.getElementById("circuit-work-preview");
  const blockPreviewEl = document.getElementById("circuit-block-preview");
  const workList = Array.isArray(state.workSites) ? state.workSites : [];
  const isWhitelist = state.mode === "whitelist";
  const activeListName = isWhitelist ? "whitelist" : "blacklist";
  const blockList = Array.isArray(state[activeListName]) ? state[activeListName] : [];

  if (state.lastWorkTab?.domain) {
    workPreviewEl.textContent = state.lastWorkTab.domain;
  } else if (workList.length > 0) {
    workPreviewEl.textContent =
      workList.length > 1 ? `${workList[0]} +${workList.length - 1}` : workList[0];
  } else {
    workPreviewEl.textContent = t("popup_no_target", activeLang);
  }

  if (isWhitelist) {
    blockPreviewEl.textContent = t("popup_all_outside", activeLang);
  } else if (blockList.length > 0) {
    blockPreviewEl.textContent =
      blockList.length > 1 ? `${blockList[0]} +${blockList.length - 1}` : blockList[0];
  } else {
    blockPreviewEl.textContent = t("popup_no_filter", activeLang);
  }

  // Work sites tags
  const workListEl = document.getElementById("work-sites-list");
  renderTags(workListEl, workList, "work", status.locked, "workSites");

  // Distraction / Whitelist sites tags
  const blockTitleEl = document.getElementById("block-section-title");
  const modePillEl = document.getElementById("mode-pill");
  blockTitleEl.textContent = t(
    isWhitelist ? "popup_sec2_whitelist" : "popup_sec2_blacklist",
    activeLang
  );
  modePillEl.textContent = t(
    isWhitelist ? "popup_mode_whitelist" : "popup_mode_blacklist",
    activeLang
  );

  const blockListEl = document.getElementById("block-sites-list");
  renderTags(
    blockListEl,
    blockList,
    isWhitelist ? "work" : "block",
    status.locked,
    activeListName
  );

  // Stats
  const totalEl = document.getElementById("popup-stats-total");
  const topEl = document.getElementById("popup-stats-top");
  totalEl.textContent = String(state.stats?.total || 0);

  const entries = Object.entries(state.stats?.perSite || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (entries.length > 0) {
    topEl.textContent = entries.map(([site, count]) => `${site} ${count}`).join("  ·  ");
  } else {
    topEl.textContent = t("popup_stats_empty", activeLang);
  }
}

function startDisableCountdown(onComplete, onCancel) {
  if (delayInterval) {
    clearInterval(delayInterval);
  }
  const delayBox = document.getElementById("delay-box");
  const delaySecEl = document.getElementById("delay-sec");
  const btnCancel = document.getElementById("btn-cancel-delay");

  let remaining = DISABLE_DELAY_SECONDS;
  delaySecEl.textContent = String(remaining);
  delayBox.classList.remove("hidden");

  btnCancel.onclick = () => {
    clearInterval(delayInterval);
    delayInterval = null;
    delayBox.classList.add("hidden");
    onCancel();
  };

  delayInterval = setInterval(async () => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(delayInterval);
      delayInterval = null;
      delayBox.classList.add("hidden");
      await onComplete();
    } else {
      delaySecEl.textContent = String(remaining);
    }
  }, 1000);
}

async function detectCurrentTab() {
  const domainLabel = document.getElementById("current-tab-domain");
  const btnWork = document.getElementById("btn-add-current-work");
  const btnBlock = document.getElementById("btn-add-current-block");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const host = extractHostname(tab?.url || "");
    if (!host) {
      domainLabel.textContent = t("popup_system_tab", activeLang);
      btnWork.disabled = true;
      btnBlock.disabled = true;
      return;
    }
    currentTabHostname = host;
    domainLabel.textContent = host;
    btnWork.disabled = false;
    btnBlock.disabled = false;
  } catch {
    btnWork.disabled = true;
    btnBlock.disabled = true;
  }
}

async function initPopup() {
  document.getElementById("btn-open-options").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById("btn-toggle-lang").addEventListener("click", async () => {
    const nextLang = activeLang === "fr" ? "en" : "fr";
    const r = await chrome.runtime.sendMessage({
      type: "SET_LANGUAGE",
      language: nextLang
    });
    if (r?.ok) updateUI(r.state, r.status, r.lang);
  });

  await detectCurrentTab();

  const res = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  if (res?.ok) {
    updateUI(res.state, res.status, res.lang);
  }

  document.getElementById("btn-add-current-work").addEventListener("click", async () => {
    if (!currentTabHostname) return;
    const r = await chrome.runtime.sendMessage({
      type: "QUICK_ADD_DOMAIN",
      listName: "workSites",
      domain: currentTabHostname
    });
    if (r?.ok) updateUI(r.state, r.status, r.lang);
  });

  document.getElementById("btn-add-current-block").addEventListener("click", async () => {
    if (!currentTabHostname) return;
    const r = await chrome.runtime.sendMessage({
      type: "QUICK_ADD_DOMAIN",
      listName: "blacklist",
      domain: currentTabHostname
    });
    if (r?.ok) updateUI(r.state, r.status, r.lang);
  });

  document.getElementById("form-add-work").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("input-add-work");
    const domain = normalizeDomain(input.value);
    if (!domain) return;
    input.value = "";
    const r = await chrome.runtime.sendMessage({
      type: "QUICK_ADD_DOMAIN",
      listName: "workSites",
      domain
    });
    if (r?.ok) updateUI(r.state, r.status, r.lang);
  });

  document.getElementById("form-add-block").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("input-add-block");
    const domain = normalizeDomain(input.value);
    if (!domain) return;
    input.value = "";
    const listName = latestState?.mode === "whitelist" ? "whitelist" : "blacklist";
    const r = await chrome.runtime.sendMessage({
      type: "QUICK_ADD_DOMAIN",
      listName,
      domain
    });
    if (r?.ok) updateUI(r.state, r.status, r.lang);
  });

  document.querySelectorAll(".btn-session").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const minutes = Number(btn.dataset.minutes) || 25;
      const r = await chrome.runtime.sendMessage({
        type: "START_SESSION",
        minutes
      });
      if (r?.ok) updateUI(r.state, r.status, r.lang);
    });
  });

  const chkAuto = document.getElementById("chk-auto-trigger");
  chkAuto.addEventListener("change", async () => {
    if (chkAuto.checked) {
      const r = await chrome.runtime.sendMessage({
        type: "SET_AUTO_TRIGGER",
        autoTriggerEnabled: true
      });
      if (r?.ok) updateUI(r.state, r.status, r.lang);
      return;
    }

    chkAuto.checked = true;
    startDisableCountdown(
      async () => {
        const r = await chrome.runtime.sendMessage({
          type: "SET_AUTO_TRIGGER",
          autoTriggerEnabled: false
        });
        if (r?.ok) updateUI(r.state, r.status, r.lang);
      },
      () => {
        chkAuto.checked = true;
      }
    );
  });

  const chkManual = document.getElementById("chk-manual-on");
  chkManual.addEventListener("change", async () => {
    if (chkManual.checked) {
      const r = await chrome.runtime.sendMessage({
        type: "SET_MANUAL",
        manualOn: true
      });
      if (r?.ok) updateUI(r.state, r.status, r.lang);
      return;
    }

    chkManual.checked = true;
    startDisableCountdown(
      async () => {
        const r = await chrome.runtime.sendMessage({
          type: "SET_MANUAL",
          manualOn: false
        });
        if (r?.ok) updateUI(r.state, r.status, r.lang);
      },
      () => {
        chkManual.checked = true;
      }
    );
  });
}

initPopup();
