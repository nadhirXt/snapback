import { tauriInvoke, tauriListen } from "./engine.js";
import { applyDomTranslations } from "./lib/i18n.js";

let countdownTimer = null;

async function finishOverlay() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  await tauriInvoke("trigger_overlay_complete");
}

function startCountdown(ctx) {
  if (!ctx) return;
  const lang = ctx?.lang || "fr";
  applyDomTranslations(document, lang);

  const label = ctx?.distractionLabel || "instagram.com";
  document.getElementById("ov-distraction").textContent = label;
  document.getElementById("ov-node-blocked").textContent = label;
  document.getElementById("ov-node-work").textContent =
    ctx?.returnTarget?.title || ctx?.returnTarget?.processName || "Espace de travail";

  if (countdownTimer) clearInterval(countdownTimer);
  let remaining = 3;
  document.getElementById("ov-sec").textContent = "3";
  document.getElementById("ov-ring-num").textContent = "3";

  const bar = document.getElementById("ov-bar");
  bar.style.transition = "none";
  bar.style.transform = "scaleX(1)";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bar.style.transition = "transform 3s linear";
      bar.style.transform = "scaleX(0)";
    });
  });

  countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      finishOverlay();
    } else {
      document.getElementById("ov-sec").textContent = String(remaining);
      document.getElementById("ov-ring-num").textContent = String(remaining);
    }
  }, 1000);
}

document.getElementById("btn-ov-now").addEventListener("click", finishOverlay);
window.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === "Escape") {
    e.preventDefault();
    finishOverlay();
  }
});

tauriListen("overlay-context", (payload) => {
  startCountdown(payload);
});

// Fetch context on initial load or visibility change in case the event arrived before listener attached
window.addEventListener("focus", async () => {
  if (!countdownTimer) {
    const ctx = await tauriInvoke("get_overlay_context");
    if (ctx) startCountdown(ctx);
  }
});
