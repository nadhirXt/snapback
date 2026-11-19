# 🚀 Kit de Publication GitHub & LinkedIn — SnapBack

Ce guide contient tout ce qu'il te faut pour :
1. Publier le dépôt **SnapBack** sur ton GitHub en **1 minute**.
2. Enregistrer une **démo vidéo/GIF de 15 secondes** qui attire l'œil.
3. Copier-coller ton **post LinkedIn** (version Française ou Anglaise) pensé pour générer des réactions et des étoiles GitHub.

---

## 1. Publier sur GitHub en 1 minute (Commandes à copier-coller)

1. Crée un nouveau dépôt public vide nommé `snapback` sur [github.com/new](https://github.com/new) (sans cocher README ni LICENSE, on les a déjà créés).
2. Lance ces commandes dans ton terminal :

```bash
cd /home/nadhir/Desktop/projey
git init
git add .
git commit -m "feat: initial release of SnapBack (ADHD Session Planner & Boomerang Blocker)"
git branch -M main
git remote add origin https://github.com/nadhirXt/snapback.git
git push -u origin main
```

3. **Créer la Release `.zip` pour les utilisateurs non-développeurs :**
   - Sur ta page GitHub, clique sur **Releases** -> **Create a new release**.
   - Tag : `v1.0.0`, Titre : `SnapBack v1.0.0 — Initial Open-Source Release`.
   - Glisse-dépose le fichier `/home/nadhir/Desktop/projey/dist/snapback-v1.0.0.zip` (déjà généré par `npm run package`).
   - Clique sur **Publish release**.

---

## 2. Script Vidéo de 15 secondes pour ton Post LinkedIn

Sur LinkedIn, un post avec une courte vidéo (15 s, sans son, montrant l'outil en action) fait **3× à 5× plus de vues** qu'un post texte seul.

**Scénario en 4 plans (15 secondes) :**
1. **(0s – 4s)** Tu es sur un onglet **Google Docs** (*"Projet Important"*). Tu cliques sur l'icône **SnapBack** : on voit tes *Sites de travail planifiés* (`docs.google.com`) et tes *Sites à fermer* (`instagram.com`), avec le badge **🟢 Auto-Focus actif**.
2. **(4s – 7s)** Tu ouvres un nouvel onglet et tu tapes `instagram.com` + Entrée.
3. **(7s – 11s)** Zéro fil Instagram : l'écran sombre **"Concentre-toi."** apparaît instantanément avec *"Objectif planifié : Projet Important — Google Docs"* et le compte à rebours **3... 2... 1...**.
4. **(11s – 15s)** À **0**, l'onglet Instagram **se ferme tout seul** et le navigateur **revient automatiquement sur ton Google Doc**.

---

## 3. Post LinkedIn prêt à copier-coller (Version Française 🇫🇷)

```text
Vous êtes en train de travailler sur Google Docs ou de coder… et sans même réfléchir, vos doigts font Ctrl+T → instagram.com ? 😅

Avec le TDAH, j'ai testé presque tous les bloqueurs de sites du Chrome Web Store.
Ils avaient tous les 3 mêmes problèmes :
1️⃣ On oublie de les activer avant de commencer à travailler.
2️⃣ Ils bloquent la page mais laissent l'onglet ouvert : on reste figé devant une page d'erreur au lieu de revenir à son travail.
3️⃣ Beaucoup sont devenus payants ou collectent l'historique de navigation.

Du coup, j'ai construit (et publié en Open-Source) ma propre extension navigateur : 🛡️ SnapBack.

Sa différence ? Le couple "Planification + Effet Boomerang" 🪃 :

✅ 1. Avant de travailler, vous planifiez VOS sites de travail du jour (ex: Google Docs, Drive, GitHub, Figma…) et VOS sites à fermer (ex: Instagram, TikTok…).
✅ 2. Auto-Activation contextuelle : dès qu'un de vos sites de travail est ouvert, le bouclier s'active tout seul (pas besoin de penser à lancer un minuteur).
✅ 3. Effet Boomerang en 3 secondes : si vous ouvrez Instagram par réflexe, un écran "Concentre-toi" vous rappelle le nom de votre document pendant 3 secondes, FERME l'onglet automatiquement et remet le focus directement sur votre onglet de travail.
✅ 4. Anti-impulsion : sessions verrouillées (25/50/90 min) + pause de 30 secondes avant toute désactivation.

🔒 100% Open-Source (Licence MIT), Manifest V3, zéro serveur, zéro collecte de données.

🔗 Le code source et le fichier .zip (installable en 30 secondes sur Chrome / Brave / Edge) sont disponibles gratuitement sur GitHub :
👉 https://github.com/nadhirXt/snapback

Si le projet vous aide (ou peut aider un étudiant / dev autour de vous), une petite étoile ⭐ sur le repo GitHub fait une énorme différence !

Quels sont les sites qui cassent le plus votre concentration au quotidien ? 👇

#OpenSource #Productivite #ADHD #TDAH #JavaScript #ChromeExtension #DeepWork #WebDev
```

---

## 4. Post LinkedIn prêt à copier-coller (English Version 🇬🇧)

```text
Ever been deep in Google Docs or coding… and your muscle memory hits Ctrl+T → instagram.com before you even realize it? 😅

Having ADHD, I tried almost every site blocker on the Chrome Web Store. They all failed for 3 reasons:
1️⃣ You forget to turn them on before working.
2️⃣ They leave the blocked tab open—so you stare at a dead error page instead of returning to your work.
3️⃣ Many have turned into aggressive paywalls or data brokers.

So I built and open-sourced 🛡️ SnapBack — a context-aware browser extension with a "Boomerang" snap-back effect 🪃:

✅ 1. Plan Your Session: Pick your planned Work Sites (Google Docs, Drive, GitHub, Notion…) and your Sites to Close (Instagram, TikTok, YouTube…).
✅ 2. Work-Tab Auto-Trigger: As soon as one of your planned work tabs is open, the shield turns on automatically. Zero timers to remember.
✅ 3. 3-Second Boomerang Close: Open Instagram by reflex? SnapBack intercepts it, shows the exact title of your open work document for 3 seconds, automatically CLOSES the distraction tab, and snaps your browser focus right back to your work tab.
✅ 4. Impulse Protection: Locked focus sessions (25/50/90m) + a 30-second cooldown before disabling.

🔒 100% Open-Source (MIT), Manifest V3, zero dependencies, 100% local privacy.

🔗 Try it in 30 seconds or check out the code on GitHub:
👉 https://github.com/nadhirXt/snapback

If you find it useful, a ⭐ on GitHub would mean the world!

#OpenSource #ADHD #Productivity #JavaScript #ChromeExtension #DeepWork #BuildInPublic
```
