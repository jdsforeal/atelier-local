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

## Version 0.14.2 — sélecteur de studios

En haut à droite, un menu déroulant liste les studios autorisés avec image (ou initiale), nom, rôle et coche du studio actif. Cliquer sur une ligne ouvre directement le studio via cloudLoadStudio ; les changements non synchronisés continuent de bloquer le changement d’espace. Le bouton du bas à gauche reste dédié aux paramètres du studio. Le sélecteur redondant dans ces paramètres est retiré.

Vérifié dans le navigateur : ouverture, liste réelle à un studio, fermeture en sélectionnant le studio actif, paramètres toujours accessibles séparément. Navigation clavier et fermeture extérieure prises en charge. Le changement réel entre deux studios reste à vérifier avec un compte qui dispose de deux studios ; aucun studio fictif ajouté au compte pour ce test. Contrôle syntaxique et tests notifications/synchronisation réussis.

## Version 0.15 — corbeille, carnet et essais Gmail

Corbeille disponible depuis l’accueil/projets et le menu ⋯ du projet. Créateur et propriétaire peuvent retirer/restaurer ; propriétaire seule peut vider toute la corbeille après saisie de SUPPRIMER. Les assistant·es perdent immédiatement l’accès. Les accès acceptés sont conservés pour une restauration ; les invitations non acceptées sont révoquées. À 30 jours, la restauration et l’accès aux documents sont refusés. La fonction de purge efface documents, membres, invitations et journal du projet ; un identifiant minimal est conservé pour empêcher sa recréation par une ancienne session.

Migration 202610150005_project_trash.sql installée et confirmée dans Supabase. Le script horaire PROJECT_TRASH_CRON.sql est prêt mais NON ACTIVÉ : revue automatique de l’action distante refusée, exigeant une confirmation explicite au moment d’installer la purge irréversible. Ne pas prétendre que la purge distante est planifiée. Les objets du stockage privé ne sont pas physiquement effacés par la purge SQL : ils deviennent inaccessibles via les règles du projet, mais leur nettoyage physique doit encore être développé avant de présenter cette fonction comme un effacement intégral des fichiers. Ne jamais supprimer directement storage.objects par SQL.

Vérifié sur le pilote connecté : mise à la corbeille du projet « Vérification du pilote — projet test », disparition de l’accueil et des tâches, restauration complète (1 projet, 8 tâches), corbeille vide finale. Aucun vidage irréversible sur les données réelles. Tests PostgreSQL : assistant non autorisé à retirer/vider, perte puis retour de lecture après restauration, écriture bloquée, restauration expirée refusée, purge des documents et vidage propriétaire. Contrôles et suite complète réussis.

Carnet : deux boutons regroupés « Ajouter un contact » et « Ajouter une marque ou un fournisseur », suivis d’une définition claire. Les onglets de consultation restent séparés des actions de création. Le texte de sauvegarde précise désormais le studio privé lorsque connecté.

Gmail : protections côté serveur par défaut en mode sandbox ; liste exacte d’adresses autorisées, vide par défaut ; contrôle atomique du lot puis contrôle du transport initial et des relances. Refus de Cc/Bcc. Tests sans réseau Gmail réussis. Le service reste non activé ; les essais réels nécessiteront OAuth Gmail et un service local (gratuit tant que lancé) ou hébergé. Aucun destinataire réel du répertoire n’a été contacté. Protocole dans mail-service/README.md.
