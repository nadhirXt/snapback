# SnapBack — Open-Source ADHD Focus App (Linux, Windows & Browser Extension)

[![License: MIT](https://img.shields.io/badge/License-MIT-4cc38a.svg)](LICENSE)
[![Desktop: Tauri 2](https://img.shields.io/badge/Desktop-Linux%20%7C%20Windows%20(Tauri%202)-ededed.svg)](desktop/)
[![Extension: Manifest V3](https://img.shields.io/badge/Extension-Chrome%20%7C%20Brave%20%7C%20Edge-3b82f6.svg)](extension/)
[![Privacy: 100% Local](https://img.shields.io/badge/Privacy-100%25%20Local-10b981.svg)](PRIVACY.md)

> **[🇫🇷 Version Française](#-version-française)** | **[🇬🇧 English Version](#-english-version)**

---

## 🇫🇷 Version Française

### Pourquoi SnapBack est différent des bloqueurs classiques

Tu travailles dans **VS Code**, **LibreOffice** ou **Google Docs**. Par réflexe TDAH, tu ouvres **Instagram** (dans Firefox, Brave, Chrome ou Edge) ou tu bascules sur **Discord / Steam**.

1. **Auto-Activation par Contexte :** dès qu'un de tes outils de travail planifiés (application ou site) est ouvert sur ton PC, la protection **SnapBack** s'active toute seule.
2. **Interception 3 secondes + Retour SnapBack :** dès que tu passes sur un site ou une application distrayante :
   - Un overlay **"Concentre-toi"** s'affiche pendant **3 secondes** avec le nom de ta fenêtre de travail.
   - À `0 s`, **SnapBack ferme l'onglet du navigateur** (ou minimise/ferme l'application distrayante) et **remet automatiquement ta fenêtre de travail au premier plan**.
3. **100 % Gratuit, Open-Source (MIT) & Local :** fonctionne sur **Linux (X11)** et **Windows**, plus une extension navigateur dédiée. Zéro compte, zéro serveur, zéro télémétrie.

### Architecture du Monorepo

```text
snapback/
├── core/        # Logique partagée JS pur (domains, state, rules, i18n, matcher) — 20 tests unitaires
├── desktop/     # Application Desktop Tauri 2 (Rust X11/Win32 + UI Graphite) pour Linux & Windows
├── extension/   # Extension Navigateur Manifest V3 (Chrome, Brave, Edge)
├── docs/        # Page Démo Interactive GitHub Pages + Kits LinkedIn & Store
└── tests/       # Suite de tests automatisés (node --test)
```

### Installation Gratuite (Utilisateurs)

- **Linux (Mint, Ubuntu, Debian, Fedora) :** télécharge le fichier `.deb` ou `.AppImage` depuis **GitHub Releases**.
- **Windows (10 / 11) :** télécharge l'installeur `.msi` ou `.exe` depuis **GitHub Releases** (*Note Windows SmartScreen : clique sur "Informations complémentaires" puis "Exécuter quand même"*).
- **Extension Navigateur (Brave / Chrome / Edge) :** télécharge `snapback-extension-v1.0.0.zip` ou charge le dossier `extension/` dans `brave://extensions`.

### Commandes Développeur

```bash
# 1. Synchroniser core/ et lancer les 20 tests unitaires JS
npm test

# 2. Générer l'archive dist/snapback-extension-v1.0.0.zip
npm run package

# 3. Lancer les tests Rust et compiler l'application Desktop (nécessite Rust + WebKit2GTK sur Linux)
cd desktop/src-tauri && cargo test && cargo build
```

---

## 🇬🇧 English Version

### How SnapBack works (Desktop App for Linux & Windows + Browser Extension)

You are working in **VS Code**, **LibreOffice**, or **Google Docs**. Muscle memory opens **Instagram** (in Firefox, Brave, Chrome, or Edge) or switches to **Discord / Steam**.

1. **Workspace Auto-Trigger:** Whenever one of your planned work apps or work sites is open, SnapBack protection activates automatically.
2. **3-Second SnapBack Return:** Open a distracting site or app by impulse?
   - A 3-second **"Stay focused"** overlay reminds you of your active work window.
   - At `0s`, SnapBack **automatically closes the browser tab** (or minimizes/terminates the distracting app) and **snaps OS focus right back to your work window**.
3. **Optional Strict Mode (`hosts`):** System-wide network blocking across all browsers via `/etc/hosts` (Linux) and `hosts` (Windows).

### License

MIT License — see [LICENSE](LICENSE).
