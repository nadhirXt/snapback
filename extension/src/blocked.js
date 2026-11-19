import { applyDomTranslations, t } from "./lib/i18n.js";

const COUNTDOWN_SECONDS = 3;
const isDemo = new URLSearchParams(window.location.search).get("demo") === "1";

function getRawBlockedUrl() {
  const hash = window.location.hash ? window.location.hash.slice(1) : "";
  if (!hash) return "https://instagram.com";
  try {
    if (hash.startsWith("http%3A") || hash.startsWith("https%3A")) {
      return decodeURIComponent(hash);
    }
    return hash;
  } catch {
    return hash;
  }
}

async function triggerBoomerang() {
  try {
    await chrome.runtime.sendMessage({ type: "BOOMERANG_CLOSE", isDemo });
  } catch {
    window.close();
  }
}

async function initBlockedPage() {
  const blockedUrl = getRawBlockedUrl();
  const domainEl = document.getElementById("blocked-domain");
  const stageBlockedEl = document.getElementById("stage-blocked-domain");
  const workTitleEl = document.getElementById("work-target-title");
  const workDomainEl = document.getElementById("work-target-domain");
  const statsTotalEl = document.getElementById("stats-total");
  const statsSiteEl = document.getElementById("stats-site-count");
  const btnNow = document.getElementById("btn-boomerang-now");
  const btnLabel = document.getElementById("btn-boomerang-label");
  const headerMetaEl = document.getElementById("header-meta-text");

  btnNow.addEventListener("click", () => {
    triggerBoomerang();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      triggerBoomerang();
    }
  });

  try {
    const res = await chrome.runtime.sendMessage({
      type: "RECORD_BLOCK_AND_GET_CONTEXT",
      blockedUrl,
      isDemo
    });

    if (res && res.ok) {
      const lang = res.lang || "fr";
      applyDomTranslations(document, lang);

      if (isDemo) {
        headerMetaEl.textContent = t("blk_header_demo", lang);
      }

      const intercepted = res.blockedDomain || "instagram.com";
      domainEl.textContent = intercepted;
      stageBlockedEl.textContent = intercepted;

      const total = res.stats?.total || (isDemo ? 0 : 1);
      const siteCount = res.stats?.perSite?.[res.blockedDomain] || (isDemo ? 0 : 1);
      statsTotalEl.textContent = String(total);
      statsSiteEl.textContent = String(siteCount);

      if (res.bestWorkTab) {
        const docTitle = res.bestWorkTab.title || res.bestWorkTab.domain;
        workTitleEl.textContent = docTitle;
        workDomainEl.textContent = res.bestWorkTab.domain;
        btnLabel.textContent = t("blk_btn_return_to", lang, { title: docTitle });
      } else if (Array.isArray(res.workSites) && res.workSites.length > 0) {
        workTitleEl.textContent = t("blk_planned_workspace", lang);
        workDomainEl.textContent = res.workSites.join(", ");
      } else {
        workTitleEl.textContent = "SnapBack";
        workDomainEl.textContent = "docs.google.com";
      }
    }
  } catch {
    const fallback = blockedUrl || "instagram.com";
    domainEl.textContent = fallback;
    stageBlockedEl.textContent = fallback;
  }

  let remaining = COUNTDOWN_SECONDS;
  const numEl = document.getElementById("countdown-number");
  const inlineEl = document.getElementById("countdown-inline");
  const barEl = document.getElementById("progress-bar");

  requestAnimationFrame(() => {
    barEl.style.transition = `transform ${COUNTDOWN_SECONDS}s linear`;
    barEl.style.transform = "scaleX(0)";
  });

  const timer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(timer);
      numEl.textContent = "0";
      inlineEl.textContent = "0";
      triggerBoomerang();
    } else {
      numEl.textContent = String(remaining);
      inlineEl.textContent = String(remaining);
    }
  }, 1000);
}

initBlockedPage();
