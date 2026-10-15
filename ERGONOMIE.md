# Version 0.13 — Accès et actions visibles

- La page de connexion précède le studio et la simulation. Un compte sans studio est guidé vers sa création ou ses invitations. Les données locales restent conservées mais leur interface n’est plus accessible sans connexion. L’autorisation des données privées reste contrôlée dans PostgreSQL ; GitHub Pages sert toujours les fichiers publics de l’interface.
- Équipe et invitations est accessible dans la barre du studio. Les accès restent par projet, avec le budget masqué par défaut. Le formulaire ne déclenche aucun e-mail ; une invitation créée est suivie de l’écran qui propose de copier son lien.
- Sur chaque carte, le bouton ⋯ et le clic droit affichent les mêmes actions. Les actions principales sont aussi visibles dans le projet : modifier, ajouter/changer l’image et inviter. Le clavier permet Tab, Échap et les flèches dans le menu.
- Les images JPEG/PNG/WebP de moins de 10 Mo utilisent le cadrage existant puis le stockage privé du projet. L’image de test a été sauvegardée et rechargée avec succès depuis ce stockage.
- Le nom du studio est modifiable par sa propriétaire uniquement, par la fonction atelier_rename_studio. La migration 202610150003_studio_settings.sql doit être installée sur les projets existants. Le SETUP complet reste destiné aux nouvelles installations.

Vérifications : session Google existante, écran sans connexion (personnel et simulation), nom du studio conservé après rechargement, menu ⋯ et clic droit, ouverture directe du formulaire d’invitation sans envoyer d’invitation, image privée conservée après rechargement, tests PostgreSQL de renommage par propriétaire et refus des autres comptes, suite de tests du pilote.

Le contrôle de largeur mobile n’a pas pu être confirmé par l’outil navigateur (il a conservé 1280 px malgré la demande de 390 px). Les boutons tactiles et règles adaptatives sont présents ; un essai sur téléphone reste à faire par l’utilisatrice. Les invitations à un deuxième compte n’ont pas été envoyées pendant cette vérification.

## Version 0.14 — studio et invitations

Le compte présente trois entrées principales : personnalisation, équipe et invitations. Le bouton en haut à droite comporte un avatar, le nom et une flèche ; la carte du bas de la barre latérale ouvre les mêmes réglages. Le nom et la miniature du studio sont modifiables par la personne propriétaire uniquement. La migration 202610150004_studio_profile.sql est installée sur le pilote ; SETUP reste destiné aux nouvelles installations.

Une cloche avec compteur et un bandeau signalent les invitations non acceptées, non révoquées et non expirées liées à l’adresse connectée. Vérification à l’ouverture, au retour sur la page et toutes les 45 secondes lorsque la page est visible. Aucun e-mail ni notification système lorsque le site est fermé. Les invitations reçues ne déclenchent aucune acceptation automatique.

Les outils de récupération sont rangés sous Dépannage et données. La récupération recharge la sauvegarde du serveur avec confirmation en cas de modifications locales ; la reprise d’enregistrement n’est proposée qu’en cas d’erreur ou de modifications en attente.

Vérifié : menu et formulaire dans le navigateur, accès par la carte latérale, boîte des invitations vide réelle, enregistrement du profil sans changer son identité. Tests PostgreSQL pour les droits de modification et le format des images, tests de notifications (filtrage par adresse, erreur réseau, changement de compte), suite complète. L’ajout d’une photo réelle et la réception d’une invitation sur un deuxième compte restent à essayer avec l’utilisatrice. Aucune photo de démonstration n’a été laissée sur son studio.

## Version 0.14.1 — import visuel des images

Tous les champs d’image (studio, couverture du projet, pièces, options et inspirations) utilisent une zone de dépôt commune, également accessible par clic, clavier et sélection tactile. L’import multiple reste disponible pour les inspirations. Miniatures et noms de fichiers apparaissent avant validation ; retirer la sélection ne supprime pas l’image sauvegardée. Le cadrage et l’enregistrement existants restent déclenchés à la validation du formulaire.

Les fichiers hors JPEG/PNG/WebP, trop lourds ou multiples dans un champ simple sont refusés. Un dépôt invalide conserve la sélection valide précédente. Les aperçus utilisent des URL locales temporaires libérées à leur remplacement ou au retrait du formulaire.

Vérification navigateur : formulaire projet, sélection réelle d’une image depuis le sélecteur, aperçu puis retrait sans enregistrement. Tests des événements de dépôt simple/multiple et refus de format/taille ; suite complète réussie. Le glissement physique depuis Finder n’a pas été automatisé par l’outil navigateur.
