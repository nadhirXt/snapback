# Guide de Distribution 0 $ — Microsoft Edge Add-ons, GitHub Releases & GitHub Pages

Ce guide te permet de publier **SnapBack** gratuitement (0 $) pour que tes utilisateurs sur LinkedIn et GitHub puissent :
1. **Tester le Boomerang en direct** sur ta page web GitHub Pages (`docs/index.html`).
2. **Installer en 1 clic sur Microsoft Edge** via le store officiel Microsoft Edge Add-ons (inscription développeur **0 $**).
3. **Installer en 30 secondes sur Brave / Chrome** via l'archive `dist/snapback-v1.0.0.zip` sur GitHub Releases.

---

## 1. Activer la Page Démo Interactive sur GitHub Pages (0 $, 30 secondes)

Le dossier `docs/` contient déjà [index.html](index.html), [demo.css](demo.css) et [demo.js](demo.js).

1. Pousse le code sur ton dépôt GitHub (`git push -u origin main`).
2. Sur GitHub, ouvre **Settings** -> **Pages** (dans la colonne de gauche).
3. Sous **Build and deployment** :
   - **Source** : `Deploy from a branch`
   - **Branch** : `main` et dossier `/docs`
   - Clique sur **Save**.
4. En 60 secondes, ta page démo interactive est en ligne sur :
   `https://nadhirXt.github.io/snapback/`

---

## 2. Publier sur Microsoft Edge Add-ons (0 $, Installation 1-Clic)

Contrairement au Chrome Web Store (5 $), le programme développeur **Microsoft Edge Add-ons est 100 % gratuit** et accepte directement notre fichier `dist/snapback-v1.0.0.zip`.

### Étapes de soumission (5 minutes)

1. Ouvre [partner.microsoft.com/dashboard/microsoftedge/overview](https://partner.microsoft.com/dashboard/microsoftedge/overview) et connecte-toi avec un compte Microsoft/GitHub personnel (0 $).
2. Clique sur **Create new extension** et téléverse `/home/nadhir/Desktop/projey/dist/snapback-v1.0.0.zip`.
3. **Availability & Category** :
   - Visibility : `Public`
   - Category : `Productivity`
4. **Privacy Policy URL** :
   - Colle le lien vers ton fichier `PRIVACY.md` sur GitHub :
     `https://github.com/nadhirXt/snapback/blob/main/PRIVACY.md`
5. **Certification Notes (Justifications des permissions à copier-coller pour le validateur Microsoft)** :

```text
SnapBack is a 100% local, open-source ADHD focus extension. It makes zero network requests and collects zero user data.
- declarativeNetRequest & <all_urls>: Used locally to redirect user-configured distraction domains to the local src/blocked.html page.
- tabs: Used locally to check if one of the user's planned work sites (e.g. docs.google.com) is open to auto-enable protection and snap focus back to the work tab after closing a distraction tab.
- storage: Saves user domain lists and schedules locally in chrome.storage.local.
- alarms & notifications: Manages timed focus sessions and recurring schedules locally.
```
