# Lire et modifier Atelier

Ce dossier est le code exécuté par le serveur local sur le port 5173.
Les modifications s’effectuent directement dans ces fichiers. VS Code est un éditeur : il faut ouvrir ce dossier, et non une ancienne copie téléchargée.

## Démarrer et reconnaître la version

`npm run dev` démarre le serveur. La version courante est **0.5 · Choix & traçabilité**, visible en haut de l’interface.
Ouvrir `http://127.0.0.1:5173/?mode=simulation&v=0.5` affiche la simulation récente.
L’espace personnel et chaque génération de simulation sont enregistrés séparément dans le navigateur ; changer la version ne supprime pas les anciennes données.

## Organisation des fichiers

| Fichier                  | Responsabilité                                                      |
| ------------------------ | ------------------------------------------------------------------- |
| `server.mjs`             | Sert les fichiers locaux ; ne conserve pas de données métier.       |
| `public/index.html`      | Structure de la page et ordre de chargement des scripts.            |
| `public/style.css`       | Apparence et adaptation aux petits écrans.                          |
| `public/app.js`          | Navigation et fonctions communes : formulaires, moodboards, tâches. |
| `public/catalog.js`      | Références réelles, liens et métadonnées sourcées.                  |
| `public/demo.js`         | Scénarios fictifs : 50 projets clôturés et 10 actifs.               |
| `public/workspace.js`    | Recherche, pagination, budgets, contacts et sauvegarde.             |
| `public/simulation.js`   | Parcours, demandes, réceptions, retours et clôture.                 |
| `public/look-model.js`   | Règles des propositions de looks, sélection des pièces et journal.  |
| `public/look-choices.js` | Interface des pistes et options ; actions de sélection.             |

Les scripts utilisent actuellement des fonctions communes dans l’ordre indiqué dans `index.html`. Les vues spécialisées complètent le rendu précédent. C’est une structure de prototype : un passage à des modules ES explicites est une étape ultérieure, pas une refonte déjà réalisée.

## Modèle métier

Projet → looks à produire → propositions créatives (variantes) → besoins → pièces candidates.

- Un projet peut demander quatre looks à produire : ces quatre looks sont distincts.
- Pour chacun, plusieurs pistes A/B/C peuvent être comparées.
- Un besoin (par exemple « bijoux ») reçoit plusieurs options.
- « Retenue » décrit le choix créatif. Cela ne signifie pas « disponible » ou « engagée au budget ».
- « Engagé » ajoute le coût au budget. La disponibilité et la logistique gardent leur propre statut.
- Un besoin peut demander une seule pièce finale ou plusieurs pièces, par exemple une superposition de bijoux.
- Les identifiants relient les fiches ; l’interface affiche les noms.

## Traçabilité

`selectionHistory` conserve la date, le projet, le look, le besoin, la pièce, l’action et le motif.
Les motifs de refus et de reconsidération restent visibles ; remplacer une sélection conserve l’ancien choix dans le journal.
Une pièce engagée ne peut pas être écartée ou remplacée silencieusement. Un projet terminé doit être rouvert pour modifier sa sélection.
Les projets fictifs possèdent un historique initial explicitement marqué comme simulation.

## Sauvegarde et limites

Les champs catalogue identiques sont stockés une seule fois pour réduire la taille des sauvegardes locales. La lecture reconstitue les fiches complètes ; les personnalisations sont conservées.
L’export JSON contient les données complètes. La synchronisation entre appareils, Gmail et les comptes utilisateurs ne sont pas encore connectés. Les photos officielles servent à cette simulation locale, sans publication.

## Vérifier

`npm run check` vérifie la syntaxe de tous les fichiers. `npm test` exécute les contrôles métier lisibles dans `tests/look-choices.test.cjs` : sélection exclusive, superposition, historique, budget indépendant, sauvegarde et protection des archives.
