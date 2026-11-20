import { normalizeDomain } from "./lib/domains.js";
import { SUGGESTED_WORK_SITES, SUGGESTED_BLOCKED_SITES } from "./lib/state.js";
import { applyDomTranslations, t } from "./lib/i18n.js";

let currentState = null;
let currentStatus = null;
let activeLang = "fr";

const DAY_LABELS = {
  fr: { 1: "Lun", 2: "Mar", 3: "Mer", 4: "Jeu", 5: "Ven", 6: "Sam", 0: "Dim" },
  en: { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 0: "Sun" }
};

function showToast() {
  const toast = document.getElementById("save-toast");
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2200);
}

function renderTagList(containerId, list, styleClass, listName, locked) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    const empty = document.createElement("span");
    empty.style.color = "#85858b";
    empty.style.fontSize = "12px";
    empty.textContent = t("opt_no_domain", activeLang);
    container.appendChild(empty);
    return;
  }

  for (const domain of list) {
    const el = document.createElement("span");
    el.className = `tag-item ${styleClass}`;
    const txt = document.createElement("span");
    txt.textContent = domain;
    el.appendChild(txt);

    if (!locked) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "×";
      btn.addEventListener("click", async () => {
        const res = await chrome.runtime.sendMessage({
          type: "QUICK_REMOVE_DOMAIN",
          listName,
          domain
        });
        if (res?.ok) {
          applyState(res.state, res.status, res.lang);
          showToast();
        }
      });
      el.appendChild(btn);
    }
    container.appendChild(el);
  }
}

function renderSuggestionChips(containerId, suggestions, existingList, listName, locked) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  for (const domain of suggestions) {
    if (existingList.includes(domain)) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sug-chip";
    btn.textContent = `+ ${domain}`;
    btn.disabled = locked;
    btn.addEventListener("click", async () => {
      const res = await chrome.runtime.sendMessage({
        type: "QUICK_ADD_DOMAIN",
        listName,
        domain
      });
      if (res?.ok) {
        applyState(res.state, res.status, res.lang);
        showToast();
      }
    });
    container.appendChild(btn);
  }
}

function applyState(state, status, lang = activeLang) {
  currentState = state;
  currentStatus = status;
  if (lang) activeLang = lang;

  applyDomTranslations(document, activeLang);
  const langBtn = document.getElementById("opt-btn-lang");
  if (langBtn) {
    langBtn.textContent = activeLang.toUpperCase();
  }

  const dayMap = DAY_LABELS[activeLang] || DAY_LABELS.fr;
  document.querySelectorAll(".day-btn").forEach((btn) => {
    const d = Number(btn.dataset.day);
    if (dayMap[d]) btn.textContent = dayMap[d];
  });

  document.getElementById("opt-status-pill").textContent = status.label;
  const lockWarning = document.getElementById("lock-warning");
  lockWarning.classList.toggle("hidden", !status.locked);

  const chkAuto = document.getElementById("opt-auto-trigger");
  chkAuto.checked = Boolean(state.autoTriggerEnabled);
  chkAuto.disabled = status.locked;

  // Mode radios
  const radioBlack = document.getElementById("mode-blacklist");
  const radioWhite = document.getElementById("mode-whitelist");
  radioBlack.checked = state.mode !== "whitelist";
  radioWhite.checked = state.mode === "whitelist";
  radioBlack.disabled = status.locked;
  radioWhite.disabled = status.locked;

  document
    .getElementById("panel-blacklist")
    .classList.toggle("hidden", state.mode === "whitelist");
  document
    .getElementById("panel-whitelist")
    .classList.toggle("hidden", state.mode !== "whitelist");

  // Render tags & suggestions
  renderTagList("opt-work-tags", state.workSites, "work", "workSites", status.locked);
  renderSuggestionChips(
    "work-suggestions",
    SUGGESTED_WORK_SITES,
    state.workSites || [],
    "workSites",
    status.locked
  );

  renderTagList("opt-blacklist-tags", state.blacklist, "block", "blacklist", status.locked);
  renderSuggestionChips(
    "block-suggestions",
    SUGGESTED_BLOCKED_SITES,
    state.blacklist || [],
    "blacklist",
    status.locked
  );

  renderTagList("opt-whitelist-tags", state.whitelist, "work", "whitelist", status.locked);

  // Schedule
  const sched =
    (Array.isArray(state.schedules) && state.schedules[0]) || {
      id: "default-workdays",
      enabled: false,
      days: [1, 2, 3, 4, 5],
      start: "09:00",
      end: "17:00"
    };

  const schedEnabled = document.getElementById("sched-enabled");
  schedEnabled.checked = Boolean(sched.enabled);
  schedEnabled.disabled = status.locked;

  document.getElementById("sched-start").value = sched.start || "09:00";
  document.getElementById("sched-end").value = sched.end || "17:00";

  document.querySelectorAll(".day-btn").forEach((btn) => {
    const dayNum = Number(btn.dataset.day);
    btn.classList.toggle("selected", Array.isArray(sched.days) && sched.days.includes(dayNum));
    btn.disabled = status.locked;
  });
}

async function saveSchedule() {
  if (!currentState || currentStatus?.locked) return;
  const enabled = document.getElementById("sched-enabled").checked;
  const start = document.getElementById("sched-start").value || "09:00";
  const end = document.getElementById("sched-end").value || "17:00";
  const days = [];
  document.querySelectorAll(".day-btn.selected").forEach((btn) => {
    days.push(Number(btn.dataset.day));
  });

  const schedules = [
    {
      id: "default-workdays",
      enabled,
      days,
      start,
      end
    }
  ];

  const res = await chrome.runtime.sendMessage({
    type: "UPDATE_PLAN",
    schedules
  });
  if (res?.ok) {
    applyState(res.state, res.status, res.lang);
    showToast();
  }
}

async function initOptions() {
  const res = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  if (res?.ok) {
    applyState(res.state, res.status, res.lang);
  }

  document.getElementById("opt-btn-lang").addEventListener("click", async () => {
    const nextLang = activeLang === "fr" ? "en" : "fr";
    const r = await chrome.runtime.sendMessage({
      type: "SET_LANGUAGE",
      language: nextLang
    });
    if (r?.ok) {
      applyState(r.state, r.status, r.lang);
    }
  });

  document.getElementById("opt-auto-trigger").addEventListener("change", async (e) => {
    const r = await chrome.runtime.sendMessage({
      type: "SET_AUTO_TRIGGER",
      autoTriggerEnabled: e.target.checked
    });
    if (r?.ok) {
      applyState(r.state, r.status, r.lang);
      showToast();
    }
  });

  document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener("change", async (e) => {
      const r = await chrome.runtime.sendMessage({
        type: "UPDATE_PLAN",
        mode: e.target.value
      });
      if (r?.ok) {
        applyState(r.state, r.status, r.lang);
        showToast();
      }
    });
  });

  const bindAddForm = (formId, inputId, listName) => {
    document.getElementById(formId).addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById(inputId);
      const domain = normalizeDomain(input.value);
      if (!domain) return;
      input.value = "";
      const r = await chrome.runtime.sendMessage({
        type: "QUICK_ADD_DOMAIN",
        listName,
        domain
      });
      if (r?.ok) {
        applyState(r.state, r.status, r.lang);
        showToast();
      }
    });
  };

  bindAddForm("opt-form-work", "opt-input-work", "workSites");
  bindAddForm("opt-form-blacklist", "opt-input-blacklist", "blacklist");
  bindAddForm("opt-form-whitelist", "opt-input-whitelist", "whitelist");

  document.querySelectorAll(".day-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("selected");
    });
  });

  document.getElementById("sched-enabled").addEventListener("change", saveSchedule);
  document.getElementById("btn-save-schedule").addEventListener("click", saveSchedule);
}

initOptions();
