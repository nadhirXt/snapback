import { SnapBackDesktopEngine } from "./engine.js";
import { normalizeDomain } from "./lib/domains.js";
import { normalizeProcessName, isBrowserProcess } from "./lib/matcher.js";
import { applyDomTranslations, t } from "./lib/i18n.js";

let engine = null;
let delayInterval = null;
let simTimer = null;

function showToast() {
  const toast = document.getElementById("save-toast");
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2200);
}

function startDisableCountdown(onComplete, onCancel) {
  if (delayInterval) clearInterval(delayInterval);
  const box = document.getElementById("desk-delay-box");
  const secEl = document.getElementById("desk-delay-sec");
  const btnCancel = document.getElementById("btn-desk-cancel-delay");

  let remaining = 30;
  secEl.textContent = String(remaining);
  box.classList.remove("hidden");

  btnCancel.onclick = () => {
    clearInterval(delayInterval);
    delayInterval = null;
    box.classList.add("hidden");
    onCancel();
  };

  delayInterval = setInterval(async () => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(delayInterval);
      delayInterval = null;
      box.classList.add("hidden");
      await onComplete();
    } else {
      secEl.textContent = String(remaining);
    }
  }, 1000);
}

function renderSimpleTags(containerId, list, locked, onRemove) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  if (!Array.isArray(list) || list.length === 0) {
    const empty = document.createElement("span");
    empty.style.color = "#85858b";
    empty.style.fontSize = "12px";
    empty.textContent = "—";
    container.appendChild(empty);
    return;
  }

  for (const item of list) {
    const tag = document.createElement("span");
    tag.className = "tag-item";
    const txt = document.createElement("span");
    txt.textContent = item;
    tag.appendChild(txt);

    if (!locked) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "×";
      btn.addEventListener("click", () => onRemove(item));
      tag.appendChild(btn);
    }
    container.appendChild(tag);
  }
}

function renderBlockedApps(state, locked, lang) {
  const container = document.getElementById("desk-blocked-apps-list");
  container.innerHTML = "";
  const apps = Array.isArray(state.blockedApps) ? state.blockedApps : [];

  for (const app of apps) {
    const proc = typeof app === "string" ? app : app.process;
    const kill = typeof app === "object" && Boolean(app.kill);

    const row = document.createElement("div");
    row.className = "app-row";

    const left = document.createElement("span");
    left.textContent = proc;
    row.appendChild(left);

    const right = document.createElement("div");
    right.className = "app-row-right";

    const lbl = document.createElement("label");
    lbl.className = "switch-row";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = kill;
    chk.disabled = locked;
    chk.addEventListener("change", async () => {
      app.kill = chk.checked;
      await engine.save();
      engine.notifyUI();
      showToast();
    });
    const span = document.createElement("span");
    span.textContent = t("desk_kill_toggle", lang);
    lbl.appendChild(chk);
    lbl.appendChild(span);
    right.appendChild(lbl);

    if (!locked) {
      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.style.background = "none";
      btnDel.style.border = "none";
      btnDel.style.color = "#85858b";
      btnDel.style.cursor = "pointer";
      btnDel.textContent = "×";
      btnDel.addEventListener("click", async () => {
        engine.state.blockedApps = engine.state.blockedApps.filter(
          (a) => (typeof a === "string" ? a : a.process) !== proc
        );
        await engine.save();
        engine.notifyUI();
        showToast();
      });
      right.appendChild(btnDel);
    }

    row.appendChild(right);
    container.appendChild(row);
  }
}

function renderUI(state, status, openWindows, lang) {
  applyDomTranslations(document, lang);
  document.getElementById("desk-btn-lang").textContent = lang.toUpperCase();
  document.getElementById("desk-status-pill").textContent = status.label;
  document.getElementById("desk-stats-total").textContent = String(state.stats?.total || 0);
  document.getElementById("lock-warning").classList.toggle("hidden", !status.locked);

  const chkManual = document.getElementById("desk-manual-on");
  chkManual.checked = Boolean(state.manualOn);
  chkManual.disabled = status.locked;

  const chkAuto = document.getElementById("desk-auto-trigger");
  chkAuto.checked = Boolean(state.autoTriggerEnabled);
  chkAuto.disabled = status.locked;

  const chkStrict = document.getElementById("desk-strict-mode");
  chkStrict.checked = Boolean(state.strictMode);
  chkStrict.disabled = status.locked;

  // Populate open windows dropdown
  const select = document.getElementById("select-open-window");
  const prevVal = select.value;
  select.innerHTML = "";
  for (const w of openWindows) {
    const opt = document.createElement("option");
    opt.value = JSON.stringify({ processName: w.processName, title: w.title });
    opt.textContent = `[${w.processName || "app"}] ${w.title}`;
    select.appendChild(opt);
  }
  if (prevVal) select.value = prevVal;

  // Render tags
  renderSimpleTags("desk-work-apps-tags", state.workApps, status.locked, async (proc) => {
    engine.state.workApps = engine.state.workApps.filter((p) => p !== proc);
    await engine.save();
    engine.notifyUI();
    showToast();
  });

  renderSimpleTags("desk-work-sites-tags", state.workSites, status.locked, async (site) => {
    engine.state.workSites = engine.state.workSites.filter((s) => s !== site);
    await engine.save();
    engine.notifyUI();
    showToast();
  });

  renderSimpleTags("desk-blacklist-tags", state.blacklist, status.locked, async (site) => {
    engine.state.blacklist = engine.state.blacklist.filter((s) => s !== site);
    await engine.save();
    engine.notifyUI();
    showToast();
  });

  renderBlockedApps(state, status.locked, lang);

  // Schedule
  const sched =
    (Array.isArray(state.schedules) && state.schedules[0]) || {
      id: "default-workdays",
      enabled: false,
      days: [1, 2, 3, 4, 5],
      start: "09:00",
      end: "17:00"
    };
  document.getElementById("sched-enabled").checked = Boolean(sched.enabled);
  document.getElementById("sched-enabled").disabled = status.locked;
  document.getElementById("sched-start").value = sched.start || "09:00";
  document.getElementById("sched-end").value = sched.end || "17:00";

  document.querySelectorAll(".day-btn").forEach((btn) => {
    const d = Number(btn.dataset.day);
    btn.classList.toggle("selected", Array.isArray(sched.days) && sched.days.includes(d));
    btn.disabled = status.locked;
  });
}

function runSimulationModal() {
  if (simTimer) clearInterval(simTimer);
  const modal = document.getElementById("sim-modal");
  const secEl = document.getElementById("sim-modal-sec");
  const barEl = document.getElementById("sim-modal-bar");
  const targetEl = document.getElementById("sim-modal-target");

  const workTarget =
    engine.state.lastWorkWindow?.title ||
    engine.state.workApps[0] ||
    engine.state.workSites[0] ||
    "VS Code";
  targetEl.textContent = workTarget;

  let remaining = 3;
  secEl.textContent = "3";
  modal.classList.remove("hidden");

  barEl.style.transition = "none";
  barEl.style.transform = "scaleX(1)";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      barEl.style.transition = "transform 3s linear";
      barEl.style.transform = "scaleX(0)";
    });
  });

  simTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(simTimer);
      simTimer = null;
      modal.classList.add("hidden");
    } else {
      secEl.textContent = String(remaining);
    }
  }, 1000);
}

async function initDesktopApp() {
  engine = new SnapBackDesktopEngine(renderUI);
  await engine.init();

  document.getElementById("desk-btn-lang").addEventListener("click", () => {
    const next = engine.getLang() === "fr" ? "en" : "fr";
    engine.setLanguage(next);
  });

  document.getElementById("btn-refresh-windows").addEventListener("click", async () => {
    await engine.refreshWindows();
    engine.notifyUI();
  });

  document.getElementById("btn-pick-as-work").addEventListener("click", async () => {
    const sel = document.getElementById("select-open-window").value;
    if (!sel) return;
    const { processName } = JSON.parse(sel);
    const proc = normalizeProcessName(processName);
    if (!proc || isBrowserProcess(proc)) return;
    if (!engine.state.workApps.includes(proc)) {
      engine.state.workApps.push(proc);
      await engine.save();
      engine.notifyUI();
      showToast();
    }
  });

  document.getElementById("btn-pick-as-block").addEventListener("click", async () => {
    const sel = document.getElementById("select-open-window").value;
    if (!sel) return;
    const { processName } = JSON.parse(sel);
    const proc = normalizeProcessName(processName);
    if (!proc || isBrowserProcess(proc)) return;
    const exists = engine.state.blockedApps.some(
      (a) => (typeof a === "string" ? a : a.process) === proc
    );
    if (!exists) {
      engine.state.blockedApps.push({ process: proc, label: proc, kill: false });
      await engine.save();
      engine.notifyUI();
      showToast();
    }
  });

  document.getElementById("form-work-app").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("input-work-app");
    const proc = normalizeProcessName(input.value);
    if (!proc) return;
    input.value = "";
    if (!engine.state.workApps.includes(proc)) {
      engine.state.workApps.push(proc);
      await engine.save();
      engine.notifyUI();
      showToast();
    }
  });

  document.getElementById("form-work-site").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("input-work-site");
    const domain = normalizeDomain(input.value);
    if (!domain) return;
    input.value = "";
    if (!engine.state.workSites.includes(domain)) {
      engine.state.workSites.push(domain);
      await engine.save();
      engine.notifyUI();
      showToast();
    }
  });

  document.getElementById("form-blocked-site").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("input-blocked-site");
    const domain = normalizeDomain(input.value);
    if (!domain) return;
    input.value = "";
    if (!engine.state.blacklist.includes(domain)) {
      engine.state.blacklist.push(domain);
      await engine.save();
      engine.notifyUI();
      showToast();
    }
  });

  document.getElementById("form-blocked-app").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("input-blocked-app");
    const proc = normalizeProcessName(input.value);
    if (!proc) return;
    input.value = "";
    const exists = engine.state.blockedApps.some(
      (a) => (typeof a === "string" ? a : a.process) === proc
    );
    if (!exists) {
      engine.state.blockedApps.push({ process: proc, label: proc, kill: false });
      await engine.save();
      engine.notifyUI();
      showToast();
    }
  });

  document.querySelectorAll(".btn-session").forEach((btn) => {
    btn.addEventListener("click", () => {
      engine.startSession(Number(btn.dataset.minutes) || 25);
    });
  });

  const chkManual = document.getElementById("desk-manual-on");
  chkManual.addEventListener("change", () => {
    if (chkManual.checked) {
      engine.setManualOn(true);
      return;
    }
    chkManual.checked = true;
    startDisableCountdown(
      () => engine.setManualOn(false),
      () => {
        chkManual.checked = true;
      }
    );
  });

  const chkAuto = document.getElementById("desk-auto-trigger");
  chkAuto.addEventListener("change", () => {
    if (chkAuto.checked) {
      engine.setAutoTrigger(true);
      return;
    }
    chkAuto.checked = true;
    startDisableCountdown(
      () => engine.setAutoTrigger(false),
      () => {
        chkAuto.checked = true;
      }
    );
  });

  const chkStrict = document.getElementById("desk-strict-mode");
  chkStrict.addEventListener("change", async () => {
    const res = await engine.setStrictMode(chkStrict.checked);
    if (!res.ok) {
      chkStrict.checked = !chkStrict.checked;
    } else {
      showToast();
    }
  });

  document.querySelectorAll(".day-btn").forEach((btn) => {
    btn.addEventListener("click", () => btn.classList.toggle("selected"));
  });

  const saveSched = async () => {
    const enabled = document.getElementById("sched-enabled").checked;
    const start = document.getElementById("sched-start").value || "09:00";
    const end = document.getElementById("sched-end").value || "17:00";
    const days = [];
    document.querySelectorAll(".day-btn.selected").forEach((b) => days.push(Number(b.dataset.day)));
    engine.state.schedules = [{ id: "default-workdays", enabled, days, start, end }];
    await engine.save();
    engine.notifyUI();
    showToast();
  };

  document.getElementById("sched-enabled").addEventListener("change", saveSched);
  document.getElementById("btn-save-schedule").addEventListener("click", saveSched);
}

initDesktopApp();
