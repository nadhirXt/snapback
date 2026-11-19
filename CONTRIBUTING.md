# Contributing to SnapBack 🛡️

Merci de vouloir contribuer à **SnapBack** ! Ce projet open-source aide les étudiants, développeurs et personnes avec un TDAH à rester concentrés sur leur navigateur sans sacrifier leur vie privée.

## Architecture & Philosophie

1. **Zéro dépendance externe :** Vanilla JS (ES Modules), HTML5, CSS3, Manifest V3. Pas de bundler lourd pour que tout le monde puisse inspecter et charger le code directement.
2. **100% Local & Privé :** Aucune requête réseau externe, aucun serveur, aucune télémétrie. Tout reste dans `chrome.storage.local`.
3. **Logique pure testée :** Toute la logique métier (`src/lib/domains.js`, `src/lib/state.js`, `src/lib/rules.js`) est découplée des APIs `chrome.*` et testée via le runner natif Node (`node --test`).

## Lancer les tests et créer le package

```bash
# 1. Exécuter les tests unitaires (Node.js >= 18)
npm test

# 2. Générer le package dist/snapback-v1.0.0.zip
npm run package
```

## Soumettre une Pull Request

1. Fork le dépôt et crée une branche (`git checkout -b feat/ma-fonctionnalite`).
2. Ajoute ou mets à jour les tests dans `tests/` si tu modifies `src/lib/`.
3. Vérifie que `npm test` passe à 100%.
4. Ouvre une Pull Request en décrivant clairement le problème résolu.
