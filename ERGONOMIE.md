# Version 0.13 — Accès et actions visibles

- La page de connexion précède le studio et la simulation. Un compte sans studio est guidé vers sa création ou ses invitations. Les données locales restent conservées mais leur interface n’est plus accessible sans connexion. L’autorisation des données privées reste contrôlée dans PostgreSQL ; GitHub Pages sert toujours les fichiers publics de l’interface.
- Équipe et invitations est accessible dans la barre du studio. Les accès restent par projet, avec le budget masqué par défaut. Le formulaire ne déclenche aucun e-mail ; une invitation créée est suivie de l’écran qui propose de copier son lien.
- Sur chaque carte, le bouton ⋯ et le clic droit affichent les mêmes actions. Les actions principales sont aussi visibles dans le projet : modifier, ajouter/changer l’image et inviter. Le clavier permet Tab, Échap et les flèches dans le menu.
- Les images JPEG/PNG/WebP de moins de 10 Mo utilisent le cadrage existant puis le stockage privé du projet. L’image de test a été sauvegardée et rechargée avec succès depuis ce stockage.
- Le nom du studio est modifiable par sa propriétaire uniquement, par la fonction atelier_rename_studio. La migration 202610150003_studio_settings.sql doit être installée sur les projets existants. Le SETUP complet reste destiné aux nouvelles installations.

Vérifications : session Google existante, écran sans connexion (personnel et simulation), nom du studio conservé après rechargement, menu ⋯ et clic droit, ouverture directe du formulaire d’invitation sans envoyer d’invitation, image privée conservée après rechargement, tests PostgreSQL de renommage par propriétaire et refus des autres comptes, suite de tests du pilote.

Le contrôle de largeur mobile n’a pas pu être confirmé par l’outil navigateur (il a conservé 1280 px malgré la demande de 390 px). Les boutons tactiles et règles adaptatives sont présents ; un essai sur téléphone reste à faire par l’utilisatrice. Les invitations à un deuxième compte n’ont pas été envoyées pendant cette vérification.
