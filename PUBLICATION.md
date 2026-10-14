# Publication de la démonstration sur GitHub Pages

Le dossier public contient le site autonome. Le serveur Node sert uniquement à la prévisualisation locale et ne doit pas être hébergé sur Pages.

1. Créer un dépôt GitHub pour Atelier et y envoyer ce projet sur la branche main.
2. Dans Settings → Pages, sélectionner GitHub Actions comme source.
3. Le workflow .github/workflows/pages.yml vérifie puis publie uniquement public/ à chaque mise à jour de main.
4. Partager le lien fourni par GitHub avec ?mode=simulation&v=0.5 à la fin : la simulation complète apparaît directement.

Avec GitHub Free, cette configuration nécessite un dépôt public. Le site et son code sont alors publics. Les données de travail personnelles restent dans chaque navigateur et ne sont pas transférées au dépôt. Il n’existe actuellement ni compte utilisateur, ni synchronisation entre personnes : ce lien sert à tester l’application, pas à partager un espace métier commun.

Ne pas ajouter de sauvegarde personnelle JSON, de fichier .env ou d’identifiants au dépôt.
