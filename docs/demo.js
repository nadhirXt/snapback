const DEMO_I18N = {
  fr: {
    nav_demo: "Simulateur",
    nav_install: "Installation",
    hero_eyebrow: "Extension navigateur open-source pour le TDAH",
    hero_title: "Ferme tes distractions en 3 secondes et reviens sur ton document de travail",
    hero_sub:
      "Planifie tes sites de travail et tes sites à fermer. Dès que Google Docs, Drive ou GitHub est ouvert, la protection s'active seule. Si tu ouvres Instagram par réflexe, SnapBack ferme l'onglet après 3 secondes et remet le focus sur ton travail.",
    hero_cta_test: "Simuler l'ouverture d'instagram.com",
    hero_cta_install: "Installer gratuitement",
    spec_free: "Open-source MIT",
    spec_boomerang: "Rappel Boomerang",
    spec_local: "Local sans serveur",
    sim_btn_open: "+ Ouvrir instagram.com",
    sim_badge_auto: "Auto-Focus actif",
    sim_doc_title: "Architecture & Mémoire de Fin d'Études",
    sim_doc_meta: "Cible de travail active · Protection SnapBack enclenchée automatiquement",
    sim_avoided_suffix: "interception(s)",
    sim_prompt_text:
      "Tu travailles sur ce document. Clique ci-dessous pour simuler le réflexe d'ouvrir Instagram dans un nouvel onglet :",
    sim_btn_try: "Tester le réflexe instagram.com (3 s)",
    sim_blk_title: "Concentre-toi",
    sim_blk_sub: "Accès réflexe à instagram.com intercepté avant chargement",
    sim_node_closed: "Onglet intercepté",
    sim_node_target: "Retour automatique",
    sim_btn_return_now: "Fermer et revenir au document maintenant",
    inst_title: "Comment installer et utiliser SnapBack",
    inst_sub: "100 % gratuit, sans compte et sans serveur. Choisis ton navigateur ci-dessous :",
    brave_s1_title: "Télécharger l'archive .zip",
    brave_s1_desc:
      "Récupère la dernière version stable depuis GitHub Releases et décompresse le dossier sur ton ordinateur.",
    brave_s1_btn: "Télécharger snapback-v1.0.0.zip",
    brave_s2_title: "Activer le Mode développeur",
    brave_s2_desc:
      "Ouvre brave://extensions ou chrome://extensions, active le Mode développeur en haut à droite et clique sur Charger l'extension non empaquetée.",
    brave_s3_title: "Planifier et tester en 3 s",
    brave_s3_desc:
      "Le planificateur s'ouvre automatiquement : vérifie tes sites de travail, tes sites à fermer, et clique sur Tester le Boomerang (3 s).",
    brave_s3_meta: "Prêt en moins de 30 secondes",
    edge_s1_title: "Installation en 1 clic (Edge Add-ons)",
    edge_s1_desc:
      "Sur Microsoft Edge, installe directement l'extension vérifiée en 1 clic ou charge l'archive .zip dans edge://extensions.",
    edge_s2_title: "Épingler SnapBack",
    edge_s2_desc:
      "Clique sur l'icône d'extensions dans la barre d'outils Edge et affiche SnapBack pour ajouter n'importe quel site en 1 clic.",
    edge_s3_title: "Auto-Focus en arrière-plan",
    edge_s3_desc:
      "Ouvre ton outil de travail habituel (Google Docs, Drive, GitHub) : le badge passe automatiquement sur AUTO."
  },
  en: {
    nav_demo: "Simulator",
    nav_install: "Install",
    hero_eyebrow: "Open-source ADHD browser extension",
    hero_title: "Close distractions in 3 seconds and snap focus back to your work tab",
    hero_sub:
      "Plan your work sites and distraction sites. Whenever Google Docs, Drive, or GitHub is open, protection activates automatically. Open Instagram by impulse and SnapBack closes the tab after 3 seconds and focuses back on your work.",
    hero_cta_test: "Simulate opening instagram.com",
    hero_cta_install: "Install for free",
    spec_free: "MIT Open-Source",
    spec_boomerang: "Boomerang snap-back",
    spec_local: "Local, zero server",
    sim_btn_open: "+ Open instagram.com",
    sim_badge_auto: "Auto-Focus active",
    sim_doc_title: "Final Thesis & System Architecture",
    sim_doc_meta: "Active work target · SnapBack protection triggered automatically",
    sim_avoided_suffix: "interception(s)",
    sim_prompt_text:
      "You are working on this document. Click below to simulate impulsively opening Instagram in a new tab:",
    sim_btn_try: "Simulate instagram.com impulse (3s)",
    sim_blk_title: "Stay focused",
    sim_blk_sub: "Impulse visit to instagram.com intercepted before load",
    sim_node_closed: "Intercepted tab",
    sim_node_target: "Auto snap-back",
    sim_btn_return_now: "Close and return to document now",
    inst_title: "How to install and use SnapBack",
    inst_sub: "100% free, no account, zero servers. Pick your browser below:",
    brave_s1_title: "Download the .zip release",
    brave_s1_desc:
      "Download the latest release from GitHub Releases and unzip the folder on your computer.",
    brave_s1_btn: "Download snapback-v1.0.0.zip",
    brave_s2_title: "Enable Developer Mode",
    brave_s2_desc:
      "Open brave://extensions or chrome://extensions, toggle Developer Mode in the top right, and click Load unpacked.",
    brave_s3_title: "Plan and test in 3s",
    brave_s3_desc:
      "The session planner opens automatically: verify your work sites, your sites to close, and click Test Boomerang (3s).",
    brave_s3_meta: "Ready in under 30 seconds",
    edge_s1_title: "1-Click Install (Edge Add-ons)",
    edge_s1_desc:
      "On Microsoft Edge, install directly from Edge Add-ons in 1 click or load the .zip in edge://extensions.",
    edge_s2_title: "Pin SnapBack",
    edge_s2_desc:
      "Click the puzzle icon in your Edge toolbar and pin SnapBack to add any site in 1 click.",
    edge_s3_title: "Background Auto-Focus",
    edge_s3_desc:
      "Open your planned work site (Google Docs, Drive, GitHub): the badge switches to AUTO automatically."
  }
};

let currentLang = navigator.language?.toLowerCase().startsWith("en") ? "en" : "fr";
let simTimer = null;
let avoidedCount = 0;

function applyDemoLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.getElementById("demo-lang-btn").textContent = lang.toUpperCase();
  const dict = DEMO_I18N[lang] || DEMO_I18N.fr;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
}

function finishBoomerangSim() {
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
  avoidedCount += 1;
  document.getElementById("sim-avoided-count").textContent = String(avoidedCount);

  document.getElementById("sim-tab-distraction").classList.add("hidden");
  document.getElementById("sim-tab-distraction").classList.remove("active");
  document.getElementById("sim-tab-work").classList.add("active");
  document.getElementById("sim-url-text").textContent = "docs.google.com/document/d/projet-final";
  document.getElementById("sim-view-blocked").classList.add("hidden");
  document.getElementById("sim-view-work").classList.remove("hidden");
}

function startBoomerangSim() {
  if (simTimer) {
    clearInterval(simTimer);
  }

  document.getElementById("sim-tab-work").classList.remove("active");
  const igTab = document.getElementById("sim-tab-distraction");
  igTab.classList.remove("hidden");
  igTab.classList.add("active");
  document.getElementById("sim-url-text").textContent =
    "snapback://blocked#https://instagram.com";

  document.getElementById("sim-view-work").classList.add("hidden");
  document.getElementById("sim-view-blocked").classList.remove("hidden");

  let remaining = 3;
  const numEl = document.getElementById("sim-countdown-num");
  const barEl = document.getElementById("sim-progress-bar");
  numEl.textContent = "3";

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
      finishBoomerangSim();
    } else {
      numEl.textContent = String(remaining);
    }
  }, 1000);
}

function selectBrowserGuide(browser) {
  document.querySelectorAll(".b-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.browser === browser);
  });
  document.getElementById("guide-brave").classList.toggle("hidden", browser !== "brave");
  document.getElementById("guide-edge").classList.toggle("hidden", browser !== "edge");
}

function initDemoPage() {
  applyDemoLang(currentLang);

  // Auto-detect Microsoft Edge user agent
  if (/Edg\//i.test(navigator.userAgent)) {
    selectBrowserGuide("edge");
  }

  document.getElementById("demo-lang-btn").addEventListener("click", () => {
    applyDemoLang(currentLang === "fr" ? "en" : "fr");
  });

  document.getElementById("btn-hero-trigger").addEventListener("click", startBoomerangSim);
  document.getElementById("btn-sim-open-ig").addEventListener("click", startBoomerangSim);
  document.getElementById("btn-doc-trigger").addEventListener("click", startBoomerangSim);
  document.getElementById("btn-sim-return-now").addEventListener("click", finishBoomerangSim);

  document.querySelectorAll(".b-tab").forEach((btn) => {
    btn.addEventListener("click", () => selectBrowserGuide(btn.dataset.browser));
  });
}

initDemoPage();
