/**
 * Pure bilingual (FR / EN) dictionary & translation helper for SnapBack (Extension + Desktop).
 * Zero browser dependencies so it can be unit-tested with `node --test`.
 */

export const MESSAGES = {
  fr: {
    // Status labels
    status_session: "Session verrouillée ({time})",
    status_auto: "Auto-Focus actif ({domain})",
    status_schedule: "Actif (Horaire programmé)",
    status_manual: "Actif (Mode manuel)",
    status_off: "En veille",

    // Popup
    popup_delay_text: "Pause anti-impulsion avant désactivation",
    popup_delay_cancel: "Maintenir la protection active",
    popup_circuit_work: "Cible de travail",
    popup_circuit_block: "Interception",
    popup_no_target: "Aucune cible",
    popup_no_filter: "Aucun filtre",
    popup_all_outside: "Tout hors liste",
    popup_system_tab: "Onglet système",
    popup_add_tab_work: "+ Travail",
    popup_add_tab_block: "+ Fermer",
    popup_sec1_title: "Sites de travail",
    popup_auto_toggle: "Auto-activation",
    popup_add_work_ph: "Ajouter un domaine (ex. docs.google.com)",
    popup_sec2_blacklist: "Sites à fermer",
    popup_sec2_whitelist: "Domaines autorisés",
    popup_mode_blacklist: "Liste noire",
    popup_mode_whitelist: "Liste blanche",
    popup_add_block_ph: "Ajouter un domaine (ex. instagram.com)",
    popup_btn_add: "Ajouter",
    popup_sec3_title: "Session verrouillée",
    popup_manual_toggle: "Manuel",
    popup_stats_label: "Interceptions aujourd'hui",
    popup_stats_empty: "Aucune interception enregistrée aujourd'hui",
    popup_no_domain: "Aucun domaine",

    // Options & Desktop Planner
    opt_engine_state: "État du moteur",
    opt_nav_config: "Configuration",
    opt_nav_work: "Espace de travail",
    opt_nav_block: "Sites et applis à fermer",
    opt_nav_schedule: "Horaires programmés",
    opt_cycle_title: "Cycle SnapBack",
    opt_step1_title: "Détection",
    opt_step1_desc: "S'active dès qu'une fenêtre ou un site de travail planifié est ouvert",
    opt_step2_title: "Interception",
    opt_step2_desc: "Coupe tout site ou application distrayante en temps réel",
    opt_step3_title: "SnapBack 3 s",
    opt_step3_desc: "Ferme ou minimise la distraction et remet le focus sur ton travail",
    opt_page_title: "Planificateur SnapBack",
    opt_page_subtitle: "Définis tes outils de travail (sites + applications) et les distractions que SnapBack doit fermer automatiquement",
    opt_saved_toast: "Modifications enregistrées",
    opt_lock_warning: "Session verrouillée en cours — les listes et horaires redeviendront modifiables à la fin du minuteur",
    opt_welcome_title: "Démarrage rapide en 3 étapes",
    opt_welcome_s1: "1. Épingle SnapBack dans ta barre d'outils ou ta barre système",
    opt_welcome_s2: "2. Vérifie tes cibles de travail et tes distractions à fermer ci-dessous",
    opt_welcome_s3: "3. Lance une simulation de 3 secondes pour voir l'effet SnapBack en action",
    opt_btn_test_boomerang: "Tester SnapBack (3 s)",
    opt_btn_dismiss_welcome: "Masquer ce guide",
    opt_arch_node1: "1. Fenêtre de travail ouverte",
    opt_arch_note1: "Active la protection et sert de cible de retour",
    opt_arch_node2: "2. Distraction interceptée",
    opt_arch_note2: "Fermée après 3 s, retour direct à gauche",
    opt_sec1_title: "1. Sites de travail planifiés",
    opt_sec1_desc: "Domaines correspondant à tes outils de travail. SnapBack te ramène sur la dernière fenêtre de travail ouverte après chaque interception.",
    opt_auto_label: "Auto-activer quand un outil de travail est ouvert",
    opt_quick_adds: "Ajouts rapides",
    opt_work_ph: "Domaine de travail (ex. docs.google.com, figma.com, localhost)",
    opt_btn_add_work: "Ajouter aux sites de travail",
    opt_sec2_title: "2. Sites à fermer",
    opt_sec2_desc: "En liste noire, seuls les domaines ci-dessous sont fermés. En liste blanche, tout domaine absent de tes sites de travail et de la liste autorisée est fermé.",
    opt_radio_blacklist: "Liste noire",
    opt_radio_whitelist: "Liste blanche stricte",
    opt_common_distractions: "Distractions courantes",
    opt_blacklist_ph: "Domaine à fermer (ex. instagram.com, tiktok.com, youtube.com)",
    opt_btn_add_blacklist: "Ajouter aux sites à fermer",
    opt_whitelist_hint: "Tes sites de travail planifiés (Section 1) sont toujours autorisés. Ajoute ici les domaines d'authentification ou de référence nécessaires comme accounts.google.com.",
    opt_whitelist_ph: "Domaine autorisé (ex. accounts.google.com, stackoverflow.com)",
    opt_btn_add_whitelist: "Autoriser ce domaine",
    opt_sec3_title: "3. Horaires programmés",
    opt_sec3_desc: "Active automatiquement la protection sur une plage horaire récurrente, même lorsqu'aucun outil de travail n'est ouvert.",
    opt_sched_enable: "Activer la plage horaire",
    opt_sched_start: "Début",
    opt_sched_end: "Fin",
    opt_btn_save_sched: "Enregistrer l'horaire",
    opt_no_domain: "Aucun domaine configuré",

    // Desktop-specific sections
    desk_pick_window: "Choisir parmi les fenêtres ouvertes",
    desk_refresh_windows: "Actualiser les fenêtres",
    desk_work_apps_title: "Applications de travail (VS Code, LibreOffice, Terminal)",
    desk_work_apps_ph: "Nom du processus (ex. code, soffice.bin, obsidian)",
    desk_btn_add_work_app: "Ajouter l'application",
    desk_blocked_apps_title: "Applications distrayantes (Discord, Steam, Jeux)",
    desk_blocked_apps_ph: "Nom du processus (ex. discord, steam, spotify)",
    desk_btn_add_blocked_app: "Ajouter aux applis à fermer",
    desk_kill_toggle: "Tuer le processus",
    desk_minimize_only: "Minimiser",
    desk_strict_title: "Mode Strict (Blocage système fichier hosts)",
    desk_strict_desc: "Bloque les domaines au niveau réseau dans tous les navigateurs via /etc/hosts (Linux) ou hosts (Windows). Demande les droits administrateur.",
    desk_strict_toggle: "Activer le blocage réseau hosts",

    // Blocked / Overlay page
    blk_header_meta: "Interception SnapBack",
    blk_header_demo: "Simulation SnapBack (Mode test)",
    blk_title: "Concentre-toi",
    blk_subtitle_prefix: "Accès réflexe à",
    blk_subtitle_suffix: "intercepté avant chargement",
    blk_node_intercepted: "Fenêtre interceptée",
    blk_node_closing: "Fermeture",
    blk_node_target: "Cible de retour",
    blk_node_autofocus: "Focus auto",
    blk_planned_workspace: "Espace de travail planifié",
    blk_timer_text: "Fermeture et retour à ta fenêtre de travail",
    blk_btn_return: "Revenir à mon travail maintenant",
    blk_btn_return_to: "Revenir sur {title}",
    blk_key_enter: "Entrée",
    blk_stat_today: "Distractions évitées aujourd'hui",
    blk_stat_domain: "Interceptions sur cette cible"
  },

  en: {
    // Status labels
    status_session: "Locked session ({time})",
    status_auto: "Auto-Focus active ({domain})",
    status_schedule: "Active (Scheduled hours)",
    status_manual: "Active (Manual mode)",
    status_off: "Standby",

    // Popup
    popup_delay_text: "Impulse cooldown before disabling",
    popup_delay_cancel: "Keep protection active",
    popup_circuit_work: "Work target",
    popup_circuit_block: "Interception",
    popup_no_target: "No target",
    popup_no_filter: "No filter",
    popup_all_outside: "All unlisted",
    popup_system_tab: "System tab",
    popup_add_tab_work: "+ Work",
    popup_add_tab_block: "+ Close",
    popup_sec1_title: "Work sites",
    popup_auto_toggle: "Auto-trigger",
    popup_add_work_ph: "Add domain (e.g. docs.google.com)",
    popup_sec2_blacklist: "Sites to close",
    popup_sec2_whitelist: "Allowed domains",
    popup_mode_blacklist: "Blacklist",
    popup_mode_whitelist: "Whitelist",
    popup_add_block_ph: "Add domain (e.g. instagram.com)",
    popup_btn_add: "Add",
    popup_sec3_title: "Locked session",
    popup_manual_toggle: "Manual",
    popup_stats_label: "Interceptions today",
    popup_stats_empty: "No distractions intercepted today",
    popup_no_domain: "No domain",

    // Options & Desktop Planner
    opt_engine_state: "Engine status",
    opt_nav_config: "Configuration",
    opt_nav_work: "Workspace targets",
    opt_nav_block: "Sites & apps to close",
    opt_nav_schedule: "Schedules",
    opt_cycle_title: "SnapBack loop",
    opt_step1_title: "Detection",
    opt_step1_desc: "Activates whenever a planned work app or site is open",
    opt_step2_title: "Interception",
    opt_step2_desc: "Stops distracting sites and apps in real time",
    opt_step3_title: "3s SnapBack",
    opt_step3_desc: "Closes or minimizes the distraction and restores focus to your work",
    opt_page_title: "SnapBack planner",
    opt_page_subtitle: "Define your work tools (sites + apps) and the distractions SnapBack should close automatically",
    opt_saved_toast: "Changes saved",
    opt_lock_warning: "Locked session running — lists and schedules can be edited when the timer ends",
    opt_welcome_title: "Quick start in 3 steps",
    opt_welcome_s1: "1. Pin SnapBack to your browser toolbar or system tray",
    opt_welcome_s2: "2. Review your planned work targets and distractions to close below",
    opt_welcome_s3: "3. Run a 3-second test simulation to see SnapBack live",
    opt_btn_test_boomerang: "Test SnapBack (3s)",
    opt_btn_dismiss_welcome: "Dismiss guide",
    opt_arch_node1: "1. Open work window",
    opt_arch_note1: "Activates protection and serves as return target",
    opt_arch_node2: "2. Intercepted distraction",
    opt_arch_note2: "Closed after 3s, focus snaps back left",
    opt_sec1_title: "1. Planned work sites",
    opt_sec1_desc: "Domains matching your work tools. SnapBack snaps back to the most recent open work window after each interception.",
    opt_auto_label: "Auto-activate when a work tool is open",
    opt_quick_adds: "Quick add",
    opt_work_ph: "Work domain (e.g. docs.google.com, figma.com, localhost)",
    opt_btn_add_work: "Add to work sites",
    opt_sec2_title: "2. Sites to close",
    opt_sec2_desc: "In blacklist mode, only the domains below are closed. In whitelist mode, any domain outside your work sites and allowed list is closed.",
    opt_radio_blacklist: "Blacklist",
    opt_radio_whitelist: "Strict whitelist",
    opt_common_distractions: "Common distractions",
    opt_blacklist_ph: "Domain to close (e.g. instagram.com, tiktok.com, youtube.com)",
    opt_btn_add_blacklist: "Add to sites to close",
    opt_whitelist_hint: "Your planned work sites (Section 1) are always allowed. Add required login or reference domains here such as accounts.google.com.",
    opt_whitelist_ph: "Allowed domain (e.g. accounts.google.com, stackoverflow.com)",
    opt_btn_add_whitelist: "Allow domain",
    opt_sec3_title: "3. Recurring schedules",
    opt_sec3_desc: "Automatically activates protection during recurring hours, even when no work window is open.",
    opt_sched_enable: "Enable schedule window",
    opt_sched_start: "Start",
    opt_sched_end: "End",
    opt_btn_save_sched: "Save schedule",
    opt_no_domain: "No domain configured",

    // Desktop-specific sections
    desk_pick_window: "Pick from currently open windows",
    desk_refresh_windows: "Refresh open windows",
    desk_work_apps_title: "Work applications (VS Code, LibreOffice, Terminal)",
    desk_work_apps_ph: "Process name (e.g. code, soffice.bin, obsidian)",
    desk_btn_add_work_app: "Add work app",
    desk_blocked_apps_title: "Distracting applications (Discord, Steam, Games)",
    desk_blocked_apps_ph: "Process name (e.g. discord, steam, spotify)",
    desk_btn_add_blocked_app: "Add to apps to close",
    desk_kill_toggle: "Kill process",
    desk_minimize_only: "Minimize",
    desk_strict_title: "Strict Mode (System hosts file blocker)",
    desk_strict_desc: "Blocks distraction domains at the OS network level across all browsers via /etc/hosts (Linux) or hosts (Windows). Requires admin privileges.",
    desk_strict_toggle: "Enable system hosts blocking",

    // Blocked / Overlay page
    blk_header_meta: "SnapBack interception",
    blk_header_demo: "SnapBack simulation (Test mode)",
    blk_title: "Stay focused",
    blk_subtitle_prefix: "Impulse switch to",
    blk_subtitle_suffix: "intercepted before load",
    blk_node_intercepted: "Intercepted window",
    blk_node_closing: "Closing",
    blk_node_target: "Return target",
    blk_node_autofocus: "Auto-focus",
    blk_planned_workspace: "Planned workspace",
    blk_timer_text: "Closing and snapping back to your work window",
    blk_btn_return: "Return to my work now",
    blk_btn_return_to: "Return to {title}",
    blk_key_enter: "Enter",
    blk_stat_today: "Distractions avoided today",
    blk_stat_domain: "Interceptions on this target"
  }
};

/**
 * Resolves the active language ("fr" or "en") from stored preference and browser locale.
 *
 * @param {string} [storedLang] - "auto" | "fr" | "en"
 * @param {string} [navigatorLang] - e.g. "fr-FR", "en-US"
 * @returns {"fr" | "en"}
 */
export function resolveLanguage(storedLang = "auto", navigatorLang = "fr") {
  if (storedLang === "fr" || storedLang === "en") {
    return storedLang;
  }
  const nav = typeof navigatorLang === "string" ? navigatorLang.toLowerCase() : "fr";
  return nav.startsWith("en") ? "en" : "fr";
}

/**
 * Translates a key into the target language with optional `{param}` interpolation.
 *
 * @param {string} key
 * @param {"fr" | "en"} [lang]
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, lang = "fr", params = {}) {
  const dict = MESSAGES[lang] || MESSAGES.fr;
  let str = dict[key] ?? MESSAGES.fr[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}

/**
 * Applies translations to all DOM elements carrying `data-i18n` or `data-i18n-placeholder`.
 *
 * @param {Document} doc
 * @param {"fr" | "en"} lang
 */
export function applyDomTranslations(doc, lang = "fr") {
  if (!doc) return;
  doc.documentElement.lang = lang;
  doc.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      el.textContent = t(key, lang);
    }
  });
  doc.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) {
      el.setAttribute("placeholder", t(key, lang));
    }
  });
}
