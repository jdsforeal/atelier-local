# Atelier — Studio de stylisme

Version locale autonome du prototype. Aucun compte ChatGPT, service IA ou abonnement n’est nécessaire pour la consulter. Aucun envoi de mail automatique n’est activé.

## Ouvrir dans VS Code

Ouvrez ce dossier `atelier-local` avec **Fichier → Ouvrir un dossier**.

Prérequis : Node.js 18 ou plus. Dans le terminal intégré :

```sh
npm run dev
```

Ouvrez **http://127.0.0.1:5173**. Il n’y a aucune dépendance à installer : `npm install` n’est pas nécessaire. Arrêtez avec Ctrl+C. Vous pouvez aussi lancer la tâche VS Code « Démarrer Atelier ».

## Modifier

- `public/index.html` : structure de la page.
- `public/style.css` : apparence et adaptation mobile.
- `public/app.js` : données de démonstration, navigation et interactions.
- `server.mjs` : serveur local, sans compte et sans accès réseau extérieur.
- `ROADMAP.md` : prochaines étapes et limites réelles.

Après une modification, rechargez la page. Vérification syntaxique : `npm run check`.

## Données

Les projets et images sont enregistrés dans le stockage du navigateur, pour cette adresse précise. Ils ne sont pas partagés entre appareils ou navigateurs et peuvent disparaître si les données du navigateur sont effacées. Exportez régulièrement les données avec le bouton de l’application. La restauration d’une sauvegarde reste à développer.

Les données saisies sur la version hébergée ne sont pas transférées automatiquement ici : exportez-les depuis cette version pour les conserver. Cette copie locale est indépendante du site hébergé, qui n’est pas modifié ni supprimé.

Les exemples sont fictifs. Les illustrations sont intégrées. Les polices utilisent celles disponibles sur votre machine : aucune ressource externe n’est nécessaire au rendu local. Les liens externes ne s’ouvrent que lorsque vous les utilisez.

## État du prototype

Fonctionnent : création de projets, modification du brief et de l’état, ajout de looks et de besoins, suivi des besoins, ajout de pièces et photos, recherche simple, statuts, import d’images de moodboard, contacts, tâches, actualités manuelles, préparation de texte et ouverture de la messagerie.

Non connectés : IA, messagerie, envois et relances automatiques, catalogues, flux d’actualité, synchronisation, validation client. Le serveur doit rester actif pour consulter la page ; il n’exécute aucune tâche automatique.

## Version ergonomie — 14 octobre 2026

Dans la barre supérieure, « Tester la simulation » ouvre un espace séparé : 10 projets, 30 looks, 150 pièces et 100 contacts fictifs. « Revenir à mon espace » retrouve les données précédentes. Chaque espace est conservé indépendamment dans le navigateur.

- Projets : recherche, vues actifs / tous / archives, création sans code à saisir.
- Looks : besoins libres et ouverture de la sélection du look.
- Pièces : recherche, filtres par look et catégorie, modification, contact recherché par nom, rattachement au bon projet.
- Contacts : recherche par nom, marque, rôle ou ville ; 12 résultats par page.
- Budget : pièces engagées et frais engagés/payés, cautions séparées.
- Devis : brouillon reprenant les coûts et frais du projet, prestations modifiables. Aucun devis légal final ni envoi automatique.
- Sauvegarde : export JSON et import avec confirmation du remplacement.

Cette version est locale. Pas encore de connexion à Google, de synchronisation entre appareils, de messagerie automatisée ou de compte utilisateur. Le serveur doit fonctionner pour ouvrir/recharger l’application. Effacer les données du navigateur supprime les données locales ; conservez un export.

## Simulation complète — 50 projets terminés

La nouvelle simulation est indépendante de l’espace personnel et de l’ancienne démonstration. Elle propose 60 projets (50 terminés, 3 en préparation, 3 en recherche, 2 en production, 2 en retours), 180 looks, 1 020 sélections, 100 contacts fictifs, 305 demandes, 240 frais et 60 chiffrages.

Les 15 références de produits et leurs photos proviennent de fiches officielles ARKET, Rouje, A.P.C., VEJA, COS, AGMES, Galvan et Jimmy Choo. Chaque pièce conserve le lien source, le prix public dans sa devise d’origine et les informations vérifiées disponibles. Les inconnues restent signalées. Les photos sont servies localement.

Les événements, clients, personnes, échanges, coûts de prêt/location, dates, tailles confirmées et validations sont fictifs. La simulation ne prouve aucune disponibilité actuelle ou historique et n’affirme aucune collaboration avec ces marques. Aucun envoi n’a eu lieu.

Les projets terminés ont leurs tâches achevées, prêts et locations retournés, cautions restituées et frais payés. Les cas actifs comprennent une demande refusée, un budget dépassé et un retour en retard. « Parcours & bilan » et « Retours » permettent de consulter le cycle complet. La clôture refuse les projets comportant des tâches, dépenses, retours ou cautions non réglés.
