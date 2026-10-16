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

## Version 0.16 — laboratoire et pilote Gmail local

La purge horaire à 30 jours a depuis été explicitement autorisée puis activée et vérifiée dans Supabase (atelier-project-trash-retention, minute 7 de chaque heure). Cette confirmation remplace la mention NON ACTIVÉ de la version précédente. Le nettoyage physique des images reste à développer.

Un laboratoire sans réseau reprend un brouillon fournisseur et permet de simuler envoi, réponse, passage du temps et panne de lecture. Aucun envoi réel ni modification du projet. Vérifié dans le navigateur : réponse reçue sans relance, absence de réponse avec une seule relance, panne de lecture sans relance. Le moteur partagé fonctionne aussi dans le navigateur sans Buffer.

Le service Gmail local impose le propriétaire du studio, un jeton Atelier valide, un projet actif et accessible, et une liste exacte de destinataires de test. Ces contrôles précèdent chaque envoi et relance. Les objets commencent par [TEST ATELIER]. Les identifiants OAuth et jetons sont conservés hors du dépôt, dans une configuration privée ; aucun secret dans le code public. Les envois sont suspendus si la session Atelier expire ou si le projet devient inaccessible. Le service local doit rester lancé : ce n’est pas une infrastructure permanente.

Gmail API activée par le propriétaire le 16 octobre. Le client OAuth local reste à créer/importer ; aucune autorisation Gmail ni transmission réelle effectuée. La console Google du navigateur de travail échoue au chargement des clients. Tests de droits, transport, moteur navigateur et suite du pilote réussis.

## Version 0.16.1 — cadrage visuel

Les quatre curseurs sont remplacés par un cadre sur l’image : déplacement à la souris ou au doigt, huit poignées, tracé d’une nouvelle sélection et réglage au clavier (flèches, Maj pour un pas plus large). Un aperçu se met à jour pendant le geste. La proposition automatique locale existante est conservée, réappliquable par image ou en lot ; revenir à l’original est toujours possible. L’analyse visuelle reste heuristique, sans service IA ni coût, et peut ne rien rogner si le produit est ambigu.

Le composant est utilisé par prepareImageBatch, donc par les imports de pièces, options, couvertures, studio et inspirations déjà raccordés à ce parcours. Les originaux et métadonnées restent conservés. Vérification navigateur isolée avec un vrai fichier de démonstration : proposition, poignée à la souris, déplacement du cadre et retour à l’original. Tests des limites et taille minimale sur les huit poignées. Le tactile utilise Pointer Events ; essai physique sur téléphone restant à faire. Aucun projet privé modifié pendant cette vérification.

Gmail : le propriétaire a confirmé la connexion en mode essais limités par capture de l’interface. Aucun envoi réel ni suivi de réponse n’a été vérifié pendant cette étape de cadrage.

## Version 0.16.2 — cadrage des captures de boutiques

Remplacement du seuil global par deux étapes locales : recherche de grandes zones neutres compatibles avec une photo, puis recherche du sujet contrasté principal par composantes connexes. Les bandes pleine largeur, petits caractères et miniatures ne sont plus regroupés avec le produit. Les marges horizontales et verticales dépendent des dimensions du sujet. L’échantillon passe à 480 pixels de large maximum ; aucun appel IA ni transfert réseau. Une explication accompagne la proposition ou l’absence de détection.

Test sur la capture ASOS fournie, hors du dépôt, avant et après réduction/compression : la grande chaussure est isolée, menu, textes, miniatures et badge exclus. L’image réelle n’est pas incluse dans les fichiers publics ou les tests du dépôt. Des scènes synthétiques vérifient photo décentrée, navigation, miniatures, texte, image vide et objet coupé. Le précédent test de produit simple reste réussi. Ce traitement n’identifie pas sémantiquement un vêtement : fonds complexes, produits très clairs, sujets multiples ou séparés peuvent nécessiter un ajustement manuel.

## Version 0.16.3 — montants avec centimes

Les champs monétaires générés par field (coût de pièce/option, caution, budget, frais) acceptent explicitement virgule ou point et jusqu’à deux décimales. La soumission normalise la virgule en point avant les conversions numériques existantes. Les quantités entières restent inchangées. Vérifié : 32,99 et 32.99, 0,01, entier, refus des montants négatifs et de trois décimales ; suites choix, budget et finances réussies.

## Version 0.16.4 — contacts, marque et fournisseur dans les pièces

Le choix du contact d’une pièce propose les contacts du fournisseur puis de la marque, suivis du reste du carnet. Recherche par nom, structure ou e-mail ; aucune sélection automatique qui écrase un contact existant. Un contact d’une autre structure peut être choisi sans changer son rattachement original. Un contact principal par pièce ; plusieurs contacts sur un groupe fournisseur imposent toujours un choix explicite du destinataire.

À l’enregistrement réussi, une nouvelle marque est ajoutée au carnet privé avec le type Marque ; un nouveau fournisseur est ajouté avec l’activité à préciser. Les noms normalisés évitent les doublons. La pièce conserve brandId et supplierId distincts ; la référence de marque accompagne les documents du projet. Le contact choisi est proposé dans les demandes ; son changement ou une modification d’adresse invalide la validation du brouillon non envoyé. Aucun e-mail envoyé.

Tests : classement marque/fournisseur/reste du carnet, même structure sans doublon, vrai callback de sauvegarde avec nouvelles structures, contact original conservé, destinataire choisi et brouillon à relire. Contrôles et suite complète réussis.

## Version 0.16.5 — saisie sans zéro initial

Prix, cautions, enveloppes, frais et tarifs du devis : un montant nul s’efface à l’entrée dans le champ, prêt pour la saisie. Si aucun chiffre n’est saisi, le zéro revient à la sortie. Les montants non nuls ne sont pas effacés. Aucun événement de sauvegarde n’est déclenché par le simple focus.

## Version 0.16.6 — créer le contact depuis la pièce

Le bouton Ajouter un contact ouvre une fiche courte dans le formulaire courant, sans remplacer la pièce. Marque et fournisseur sont repris des champs principaux et restent synchronisés pendant la saisie ; le nom/service et l’e-mail sont les seuls champs à compléter. Les commandes de recherche et de sélection ne sont pas affichées quand le carnet est vide.

La validation de la pièce crée ou retrouve le contact privé (e-mail et mêmes structures), associe brandId et supplierId, puis sélectionne ce contact sur la pièce. Les suggestions reconnaissent ses deux rattachements. Aucun contact ni structure n’est conservé si la validation du callback échoue ; annuler la fiche n’effectue aucune écriture. Les champs temporaires ne restent pas sur la pièce. Aucun envoi Gmail.

Vérifications : parcours de sauvegarde, double rattachement, e-mail normalisé et retour arrière après échec, suite complète. Navigateur : carnet vide, ouverture inline, nom/e-mail conservés pendant le changement de marque et contexte mis à jour. Page de vérification avec données de démonstration, supprimée après vérification ; aucun projet privé modifié.

## Version 0.17.0 — importer une fiche boutique

Dans la fiche pièce, coller un lien puis Analyser le lien propose les informations publiées : nom, marque, boutique, prix en euros, description et photo disponible. Les champs déjà renseignés ne sont pas cochés ; les champs vides le sont. Une sélection explicite permet de remplacer une valeur. La photo reste facultative. Utiliser les informations ne sauvegarde pas la pièce.

Le lien ASOS fourni a été testé avec la vraie page : marque 4505, prix 32,99 €, image produit. Le nom saisi manuellement est conservé pendant l’application des autres propositions. Les métadonnées et données structurées sont lues sans exécuter le code de la boutique. Le prix ASOS est associé à l’identifiant produit et ignore les recommandations.

Le service Supabase product-import vérifie chaque session auprès de Supabase Auth, limite les appels et les origines, refuse les redirections hors des boutiques autorisées et ne lit ni n’écrit les projets. L’ancien contrôle JWT du portail est remplacé par cette validation sur autorisation explicite. Un appel anonyme sur le service déployé retourne 401. La validation avec une session réelle en ligne reste à effectuer après publication du frontend.

Limites : certains sites bloquent la lecture ; repli signalé sur les mots du lien sans inventer de prix ou photo. Boutique et fournisseur réel peuvent différer sur une marketplace. Aucune analyse OCR d’image dans cette version.

## Version 0.17.1 — classement selon la catégorie de la pièce

À l’ajout depuis un besoin du look, la catégorie validée dans la fiche détermine le besoin de destination : Haut rejoint les hauts même depuis le bouton + Bas. Le besoin choisi est conservé lorsqu’il correspond à la catégorie (y compris plusieurs besoins personnalisés de même catégorie). Sinon, le premier besoin compatible du même look est utilisé, ou créé s’il manque. Aucun déplacement vers un autre look.

Le même contrôle est appliqué à la modification : réenregistrer une fiche mal classée corrige son rattachement. Les données existantes ne sont pas migrées silencieusement. Tests du modèle et des vrais callbacks de création/modification, puis suite complète.

## Version 0.17.2 — plusieurs vues depuis un lien produit

L’import ASOS lit la galerie JSON publiée pour le produit demandé et filtre les images masquées, les autres produits et les couleurs explicitement différentes. Aucun numéro de photo n’est inventé. Jusqu’à huit vues sont proposées sous forme de cases à cocher. La photo principale se choisit séparément parmi les vues cochées ; sinon la première vue cochée devient principale. Sans sélection, l’image existante reste inchangée.

Les URLs choisies restent dans photos sur la pièce, la principale dans image. Le look affiche des miniatures permettant de changer la vue affichée sans modifier la fiche. Les exports existants et la présentation client continuent à utiliser la principale.

Test réel sur le hoodie Bershka 211795376 : six photos récupérées, sélection des vues dos et face, face principale, passage entre les deux miniatures vérifié au navigateur sur une page isolée supprimée après test. Tests de sauvegarde de deux photos et filtrage des galeries/couleurs, suite complète passée. Fonction Supabase redéployée.
