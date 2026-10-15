# Refonte du 15 octobre 2026

## Étape 1 — Réseau, fournisseurs et pièces

Répertoire de référence : 199 maisons et créateurs (annuaires FHCM et WBDM) et 15 fournisseurs de costumes français et belges. Chaque fiche conserve la source et la date du relevé. Aucun stock ni accord de prêt garanti. Un profil d’annuaire ne remplace pas le site officiel de la marque ; les pays non vérifiés restent vides.

Le répertoire ne contient pas de contacts inventés. Les coordonnées professionnelles publiées peuvent être ajoutées volontairement au carnet. Vos modifications et contacts restent dans votre espace navigateur ; ils ne sont pas redistribués aux autres utilisateurs.

Marque et fournisseur sont distincts. Une pièce peut être une création d’une maison louée par un autre fournisseur. Les contacts sont proposés par structure. Les liens restent stables malgré un changement de nom. Ajout de structure directement depuis un formulaire si elle manque.

Dans Réseau : Répertoire / Mes contacts, recherche, filtres pays et activité, 12/24/50/100 fiches par page. Dans les pièces : photo importée ou URL, fournisseur et marque recherchables. Dans les demandes : groupes par fournisseur, choix parmi ses contacts, texte modifiable, brouillon à relire ou validé. Aucun envoi automatisé, aucune relance automatique à ce stade.

## Étapes suivantes

2. Messagerie : connexion Gmail, validation d’envoi groupé, traitement serveur, réponses et relances ; le prototype GitHub Pages seul ne le permet pas.
3. Budget et devis : estimation / engagements / dépenses réelles, versions et PDF.
4. Moodboards : import multiple, mises en page, PDF dédié.
5. Parcours, annulation/report et retours rapides.
6. Veille alimentée par des sources exploitables.

Les coûts déjà engagés ne sont pas annulés silencieusement lorsqu’on écarte un choix créatif. Cette distinction doit encore recevoir une interface dédiée dans l’étape budget.

## Version 0.7 — Budget et moodboard

La prévision additionne les dépenses engagées, les pièces retenues non engagées et les frais prévus. Un remplacement ne supprime jamais un coût déjà dû. Les cautions restent séparées. Les compteurs des besoins suivent les choix. Le devis reprend la prévision à la création et peut être actualisé explicitement avec conservation de la version précédente et choix des prestations à garder.

Moodboard : import multiple d’images, légendes et liens facultatifs modifiables ensuite, reprise des pièces retenues, compositions Éditorial et Grille. Le téléchargement PDF crée uniquement les planches A4 paysage haute résolution et leurs liens sources, pas une impression de l’application. Le PDF est aplati, le moodboard reste modifiable dans l’application. Les images distantes doivent autoriser l’export ; sinon importer le fichier image.

## Version 0.8 — Moins de saisie au studio

Pièces : Bibliothèque, Stock du studio, Prêts & locations, À retourner, Restituées. Dates et statuts alimentent ces vues, sans recopier les fiches. Réception, expédition, restitution, cautions et actions sur une sélection. Les prêts ne deviennent jamais du stock personnel automatiquement. Réutilisation du stock dans un projet avec photo et références reprises, sans nouveau coût.

Actualités retirées de la navigation ; anciens favoris accessibles depuis Réseau. Pas de faux fil d’actualités.

Import : proposition locale conservatrice de cadrage, comparaison avec l’original, réglages et validation par lot. Ce n’est pas une reconnaissance sémantique du vêtement ; les captures avec plusieurs produits ou du texte exigent un contrôle. Originaux compressés conservés avec les données, restaurables. Le stockage reste limité par le navigateur.

Création de projet : modèles par type, nom proposé, jusqu’à cinq looks, besoins et jalons cochables ; échéances proposées autour de la date principale. Tous les choix restent modifiables. Aucun envoi ou rappel e-mail autonome connecté.

## Version 0.8.1 — Espace personnel sans exemples

Un nouvel espace personnel démarre vide. Les anciens projets, contacts, pièces et tâches d’exemple identifiables sont retirés des espaces existants, avec leurs liens fictifs. Les saisies réelles sont conservées ; celles liées à un projet d’exemple retiré sont détachées, sans suppression. Une copie des éléments retirés permet d’annuler le nettoyage depuis l’interface. La simulation reste isolée. Le répertoire de sources réelles est disponible sans peupler automatiquement le carnet personnel.

Lien à utiliser pour travailler : ?mode=personal&v=0.8.1. Les données étant propres à chaque navigateur, la migration s’applique à l’ouverture de cet espace sur chaque appareil.

## 0.9.0 — Console de demandes groupées et service Gmail à activer

Une ligne par fournisseur : destinataire lié, pièces, aperçu, validation, relance et délai. Sélection et validation en lot, signature commune, ajout de contact depuis une demande, relecture si les pièces ou le brief changent. Les textes se modifient directement dans la liste. L'envoi demande confirmation du lot et reste indisponible tant que le service Gmail n'est pas configuré. La simulation ne peut pas envoyer de mail.

`mail-service/` prépare l'autorisation Google par utilisatrice, la file persistante chiffrée, l'envoi Gmail, le suivi des fils, une relance unique et son arrêt sur réponse. Tests avec faux Gmail : aucun mail réel envoyé. Configuration Google et hébergement restent à réaliser par le propriétaire ; voir `mail-service/README.md`. Le service n'est pas encore activé ni vérifié avec des comptes réels.

## 0.9.1 — Export PDF du devis

Bouton « Exporter le devis PDF » dans le projet : document A4 dédié, lignes, quantités, tarifs, totaux HT et TVA optionnelle explicite, référence et version, coordonnées et conditions. Export marqué BROUILLON ; les mentions professionnelles restent à vérifier par l’utilisateur. Calculs arrondis par ligne et pagination automatique pour les documents longs. Aucun service distant ni abonnement. Le même moteur PDF conserve le format paysage des moodboards et permet le portrait du devis.

## 0.9.2 — Préparation Qonto sans compte connecté

Section dans Devis : choix des lignes à facturer, identité du donneur d'ordre reliée au PDF, contrôles de dates/TVA/montants et aperçu du parcours futur en simulation locale. Les statuts réels restent inchangés. Adaptateur de contrat testé avec un faux transport et journal anti-doublon ; aucun accès Qonto effectif. OAuth, rapprochement des clients, paramètres de TVA/numérotation et tests sandbox réels restent à réaliser quand le compte sera disponible. Aucun hébergement ni abonnement activé.

## 0.10.0 — Budget & devis dans un seul espace

Les anciens liens Budget ouvrent désormais l’onglet unique Budget & devis. L’enveloppe client HT/TTC et six indicateurs sont placés au-dessus du devis : cible, devis en construction, reste à répartir/dépassement, coûts prévus, enveloppe après coûts et solde du devis après coûts. La saisie des tarifs et quantités met les indicateurs à jour directement. Les coûts du projet restent accessibles dans la même page, avec les exports PDF et la préparation Qonto.

Les cautions prévues, engagées à récupérer et déjà récupérées restent distinctes des coûts et du devis. Un scénario explicite sans remboursement donne une anticipation, sans transformer cette hypothèse en dépense réelle. Les comparaisons utilisent les montants saisis ; l’utilisateur doit garder une base de TVA cohérente entre coûts et enveloppe. Les tarifs du devis ne modifient pas les coûts réels et la synchronisation depuis les frais reste explicite, avec conservation des versions.


## Version 0.11 — sélection client et suivi transversal

- `flow-model.js` sépare disponibilité datée, sélection créative et engagement. Les modèles existants sont conservés sans migration destructive.
- `client-flow.js` ajoute « Sélection client », ses versions conservées, l’enregistrement manuel des validations reçues, les usages d’une acquisition dans plusieurs looks et les actions du projet. Les pièces de stock déjà réutilisées conservent leur `stockSourceId` et leurs suivis par projet ; alerte sur même date, sans promesse de détection complète de conflits horaires.
- Une piste budgétaire par look évite de chiffrer simultanément des silhouettes alternatives. Une acquisition partagée n’est comptée qu’une fois ; les engagements restent dus même hors scénario. Les prévisions et nouveaux devis utilisent la même liste.
- Le PDF client autonome classe par look et piste, six options par page ; prix facultatifs, disponibilité explicite, sources cliquables. Images distantes non accessibles : emplacement signalé, importer le fichier pour garantir la photo.
- Les validations sont consignées par le studio, avec auteur et date ; aucun portail client ou signature électronique. Les versions exportées/conservées ne sont pas réécrites. La validation n’engage pas de dépense.
- Report : choix de décaler les tâches ouvertes, échéances de réception/retour et étapes non faites ; dates réelles intactes. Disponibilités/réservations à reconfirmer.
- Versions du devis client conservées séparément du brouillon et alerte si les coûts de référence changent. Le PDF reste un brouillon documentaire.
- Brouillon mail périmé : actualisation explicite du texte, ancienne révision conservée, puis validation. Complément : nouveau message et identifiant propre, ancien envoi préservé. Une relance déjà côté serveur doit être arrêtée via la connexion Gmail ; aucune fausse confirmation locale.
- Annulation : les mécanismes existants bloquent l’envoi ; le tableau garde les coûts dus, retours et cautions à régler. Réception fournisseur et remboursement restent distincts.

Limites inchangées : données locales au navigateur, sauvegardes nécessaires ; pas de synchronisation partagée, pas de Gmail/Qonto actifs, aucune dépense d’hébergement. Les réponses fournisseur et client sont saisies manuellement : aucun mail n’est interprété comme confirmation de disponibilité.

Validation : suite complète, nouveaux tests métier (options exclusives, partage, budget, versions, validation, reports, cautions), essais dans le navigateur en simulation et PDF de contrôle sur trois pages.

## Version 0.11.1 — aperçu avant téléchargement

Moodboards, sélections client, devis de travail et versions conservées ouvrent un aperçu commun dans l’application. Les pages affichées sont exactement les images utilisées pour construire le PDF ; navigation précédente/suivante, page entière ou pleine largeur, fermeture et téléchargement explicite. Aucun téléchargement au simple clic de prévisualisation. L’aperçu d’une sélection conserve une version marquée « Prévisualisée », sans la déclarer téléchargée ou transmise. Tests existants réussis ; vérification navigateur du devis (1 page), du moodboard (2 pages) et de la sélection (7 pages), navigation et affichage pleine largeur.
