# Messagerie Atelier — activation par le propriétaire

État de la version 0.9.0 : interface disponible ; service privé écrit et testé avec des réponses Gmail simulées. **Aucun compte Google connecté, aucun service hébergé, aucun envoi réel testé.** Ne pas présenter ce dossier comme un service déjà actif.

## Ce que voit une styliste

1. Sa signature se règle une fois. Les pièces ouvertes sont regroupées par fournisseur et les contacts liés sont proposés.
2. Elle sélectionne les fournisseurs, choisit les destinataires si nécessaire, lit les textes et valide la sélection.
3. Elle peut activer une relance à J+3 pour la sélection, changer les délais ou désactiver une relance individuellement.
4. « Envoyer les messages validés » ouvre une confirmation du lot : chaque destinataire reçoit son message individuel.
5. Une confirmation Gmail passe la demande en attente de réponse. Un message entrant dans le même fil arrête la relance. Une absence automatique arrête également la relance : la styliste décide de la suite.

Chaque utilisatrice autorise son compte via « Connecter Gmail ». **Elle n’a pas à créer de projet Google Cloud.** Le client OAuth est commun à Atelier ; le secret et les autorisations hors ligne sont privés côté serveur.

## Configuration unique Google

Créer un projet Google Cloud pour Atelier et activer Gmail API. Configurer une application OAuth Web, l’écran de consentement et les comptes test de Jonathan et de la styliste. Déclarer l’URL de redirection exacte `https://URL-DU-SERVICE/oauth/callback`. Les permissions demandées sont `gmail.send` et `gmail.readonly` ; aucune suppression ni modification de messages.

Conserver l’identifiant client et le secret dans les variables privées de l’hébergeur, jamais dans GitHub, `public/`, les sauvegardes du navigateur ou ce document. Une application externe utilisant ces permissions peut nécessiter la vérification Google, et selon son usage une évaluation de sécurité. Le mode de test peut limiter la durée des autorisations hors ligne : prévoir un renouvellement de connexion. Une ouverture publique nécessite également une politique de confidentialité, une procédure de suppression des comptes et une revue de sécurité ; cette version prépare un pilote privé.

Documentation : https://developers.google.com/identity/protocols/oauth2/web-server et https://developers.google.com/workspace/gmail/api/auth/scopes

## Hébergement proposé : service Node toujours actif avec disque persistant

Le site public reste sur GitHub Pages. Seul le service Gmail nécessite un hébergement supplémentaire. Un service gratuit qui se met en veille n’exécute pas la boucle de suivi lorsque personne ne consulte l’application.

Une configuration Render est préparée dans `render.yaml` (non déployée). Choisir un service **Starter**, un disque privé de 1 Go et une région européenne. Le propriétaire doit confirmer le tarif dans Render avant toute souscription. Ordre de grandeur vérifié le 15 octobre 2026 : 7 $/mois de calcul + 0,25 $/mois de disque, hors taxes et éventuels dépassements. Sources : https://render.com/articles/render-vs-railway et https://render.com/pricing

Configurer les variables décrites dans `.env.example` :

- `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` : secrets de la configuration OAuth.
- `MAIL_PUBLIC_URL` : URL HTTPS réelle du service.
- `MAIL_ALLOWED_ORIGIN` : `https://jdsforeal.github.io` pour le site actuel. Cette autorisation concerne l’origine, donc tous les chemins de ce domaine GitHub Pages ; l’authentification personnelle reste obligatoire pour chaque requête de données.
- `MAIL_ENCRYPTION_KEY` : clé base64 de 32 octets générée une fois et conservée dans un coffre distinct du disque et de ses sauvegardes.
- `MAIL_DATA_PATH` : `/data/atelier-mail.enc`, uniquement sur un volume persistant privé.

Le service natif Render démarre avec `node mail-service/server.mjs`. Node 22 ou supérieur requis. Une seule instance : le stockage chiffré de ce pilote n’est pas une base distribuée. La boucle s’exécute chaque minute et consulte uniquement les fils des demandes enregistrées. Sa fréquence effective dépend du nombre de demandes et de la disponibilité de Gmail. La session de l’écran dure 12 heures, mais le suivi autorisé continue côté serveur.

Après déploiement, renseigner **uniquement l’URL publique** dans `public/mail-config.js` et republier le site. Aucune donnée secrète ne va dans ce fichier.

## Données, annulation et incidents

Le fichier serveur est chiffré en AES-256-GCM. Il contient les autorisations de connexion, les demandes explicitement transmises et leur journal, séparés par compte Gmail. Il ne contient pas l’ensemble des projets, images ou contacts de l’application. Les jetons Gmail ne sont pas retournés au navigateur ; une session Atelier distincte est conservée dans l’onglet. Les données métier restent locales et ne sont pas synchronisées entre appareils.

Le serveur refuse un destinataire fictif, une injection d’en-tête et un message non complété. Un identifiant de demande déjà présent n’est jamais envoyé une deuxième fois. L’état « Envoi en cours » est enregistré avant chaque appel Gmail. Si le résultat est inconnu, le traitement passe en « Envoi à vérifier » et ne réessaie pas automatiquement. Vérifier Gmail manuellement dans ce cas. Une panne de lecture suspend la relance. Une seule relance par demande. Une réponse détectée n’est pas assimilée à une confirmation de disponibilité des vêtements.

L’annulation ou la clôture d’un projet est transmise au service lors de la prochaine synchronisation de l’écran connecté. Si l’écran n’est pas connecté, le service ne peut pas connaître un changement conservé uniquement dans le navigateur. Utiliser « Arrêter la relance » avant de quitter le site dans ce cas. « Déconnecter et suspendre » arrête le compte côté serveur ; une opération déjà transmise à Gmail ne peut pas être rappelée. Une reconnexion réactive le suivi des demandes précédemment autorisées.

Le contrôle d’une réponse juste avant une relance réduit les courses mais ne peut pas empêcher une réponse d’arriver au même instant que l’envoi. Les réponses hors du fil ne sont pas rapprochées automatiquement.

## Vérification obligatoire avant activation réelle

Les tests automatiques utilisent un faux transport Gmail et n’envoient rien. Avant d’activer le pilote : connecter les deux comptes test, envoyer uniquement vers une adresse de test contrôlée, vérifier le message reçu, répondre, vérifier l’arrêt de relance, puis tester un délai et un redémarrage du service. Vérifier également deux comptes isolés, le renouvellement des autorisations, les sauvegardes chiffrées et leur restauration. Pour une ouverture publique, ajouter des limites par compte, une rétention des données, la suppression/révocation des comptes et un stockage adapté à la charge. Ne pas augmenter les destinataires ou lancer des campagnes pendant ces tests.

## Pilote 0.15 — essais sans contacter le répertoire

Le service démarre désormais en `MAIL_MODE=sandbox`. Sans `MAIL_TEST_RECIPIENTS`, aucun envoi n’est autorisé. Une liste d’adresses exactes contrôlées par les testeurs doit être configurée côté serveur (séparées par une virgule). Le lot entier est refusé avant mise en file si une adresse n’est pas autorisée. Le transport vérifie encore le destinataire juste avant chaque appel Gmail, y compris les relances ; les en-têtes Cc/Bcc sont refusés. Le mode `live` est une activation explicite séparée et ne doit pas être utilisé pour le pilote.

Parcours : (1) génération et suivi avec le faux transport des tests, aucun appel Google ; (2) connexion Gmail de deux comptes de test ; (3) envoi d’une seule demande entre ces adresses, réponse dans le même fil, puis vérification de l’arrêt de relance ; (4) un deuxième essai sans réponse pour vérifier la relance unique. Aucune adresse du répertoire ne doit être autorisée. Ne pas réduire le délai de relance réel dans le moteur : les tests automatiques font avancer une horloge simulée.

Ces protections sont implémentées et testées ; elles n’activent pas Gmail. Le service doit encore être démarré et la configuration OAuth Gmail autorisée. Un service local peut servir aux essais gratuits tant que l’ordinateur reste allumé ; il ne fournit pas un suivi permanent une fois arrêté.

## Pilote local 0.16 — laboratoire et connexion au studio

Dans Demandes fournisseurs, « Essayer sans envoyer » utilise le moteur de suivi commun compilé pour le navigateur, avec un transport local fictif sans fetch. Le message du projet est copié ; aucune modification des brouillons ni de la base. L’adresse est remplacée par une adresse de laboratoire réservée `.localhost`. Les boutons simulent l’envoi, la réponse, le passage de quatre jours et une panne de lecture. Ne pas confondre cet essai avec un envoi Gmail.

Le service réel du pilote est réservé au propriétaire du studio. Il exige un jeton Supabase utilisateur valide et vérifie le studio propriétaire et le projet actif avant la mise en file, puis avant le traitement de chaque demande/relance. Un projet dans la corbeille, annulé, terminé, un accès retiré ou une session expirée suspend le traitement. Le jeton utilisateur est conservé chiffré avec la session Gmail et renouvelé lors des appels de l’application ; il n’y a pas de rafraîchissement Supabase hors ligne : la fermeture prolongée de l’application suspend donc les relances à expiration du jeton. Ce pilote local n’est pas une infrastructure de suivi permanent.

Les appels réels depuis un site GitHub Pages restent désactivés : seul l’Atelier sur `http://127.0.0.1:5173` propose le service local à `http://127.0.0.1:8787`. Les fichiers du serveur restent hors du dossier public. Le service local écoute uniquement sur la boucle locale. Aucune souscription payante.

Le mode sandbox affiche uniquement les adresses de test autorisées par le serveur, exige un objet `[TEST ATELIER]`, et refuse tout autre compte expéditeur ou destinataire. Les adresses du pilote sont configurées dans le fichier privé local, pas dans GitHub.

Configuration Google à réaliser une fois dans le projet existant : activer Gmail API, créer un client OAuth Web « Atelier Gmail — essais locaux », redirection `http://127.0.0.1:8787/oauth/callback` ; aucun besoin de modifier le client utilisé par Supabase. Le propriétaire crée le client et télécharge son JSON directement dans son dossier privé. `scripts/import-mail-oauth.mjs` importe ce fichier explicite sans afficher les identifiants ; `scripts/check-mail-local.mjs` vérifie la présence des paramètres sans leurs valeurs. Ne jamais transmettre le JSON ou le secret dans le chat.

### Envois programmés

La validation d’un lot permet de choisir une date et une heure dans le fuseau de l’appareil. Le navigateur transmet un instant UTC au service, qui conserve le lot et ne l’envoie pas avant cet instant. Les relances partent du moment d’envoi effectif. La date peut être déplacée et l’envoi annulé tant que le traitement n’a pas commencé. Les droits et les restrictions de destinataires sont toujours vérifiés.

Le service doit rester actif ; son traitement s’exécute environ chaque minute. Une interruption retarde les envois à sa reprise. Mettre à jour puis redémarrer le service pour activer la fonction ; le client désactive la programmation si le serveur ne renvoie pas `schedulingSupported: true`. Le déploiement du seul site ne met pas à jour le service Gmail.

### Rédaction Gemini facultative — pilote gratuit

Les boutons de rédaction proposent un texte à comparer, appliquer ou écarter. L’application ne valide ni n’envoie une proposition IA automatiquement ; le texte précédent reste disponible. Les brouillons classiques fonctionnent sans Gemini.

Configuration privée : `MAIL_AI_ENABLED=1`, `GEMINI_API_KEY`, `GEMINI_MODEL` et `GEMINI_FREE_TIER_CONFIRMED=1`. Cette dernière valeur confirme que le propriétaire a vérifié dans AI Studio que la clé appartient à un projet Free Tier sans facturation activée. Le code ne peut pas déduire le plan de facturation de la clé ; si le propriétaire active la facturation chez Google, une requête pourrait devenir payante. Ne pas activer cette configuration avant cette vérification. Les clés ne doivent jamais être placées dans `public/` ou dans le dépôt.

Modèle proposé au 17 octobre 2026 : `gemini-3.8-flash`, dont la disponibilité gratuite doit être vérifiée sur le projet. Sources : https://ai.google.dev/gemini-api/docs/pricing et https://ai.google.dev/gemini-api/docs/generate-content/structured-output . Pas de changement automatique de modèle, pas de retry automatique. En cas de quota atteint ou d’échec, le brouillon reste inchangé. Une limite supplémentaire de 20 tentatives par utilisateur et par jour UTC est appliquée en mémoire (réinitialisée au redémarrage) ; ce n’est pas un plafond de facturation Google.

Le contexte envoyé comporte uniquement titre/client/type/date du projet, fournisseur/contact, signature, références/modes/tailles/liens/dates de retour des pièces. Les budgets, brief, notes internes et images sont exclus. L’API est réservée au propriétaire du studio et vérifie son accès au projet. Gmail n’a pas besoin d’être connecté pour rédiger, mais le service privé doit être configuré et actif.

Tester d’abord avec des projets fictifs. Aucune clé réelle et aucun appel fournisseur n’ont été utilisés dans les tests automatisés.

### Aperçu enrichi et diagnostic de connexion

Le client transmet les associations nom d’article / URL autorisée ; le service construit un message `multipart/alternative`, avec une version texte et une version HTML échappée. Le même formateur est utilisé pour l’aperçu. Aucune balise saisie par l’utilisateur n’est interprétée. Mettre à jour le service Gmail également pour obtenir les liens sur les noms dans les mails reçus.

Une session Gmail mémorisée ne prouve pas que le service est lancé. En local, `http://127.0.0.1:8787/health` doit répondre avant de tester la rédaction ou la synchronisation. Le 17 octobre, ce port ne répondait pas lors du diagnostic du message « Failed to fetch ». Le service n’a pas été relancé automatiquement : il pourrait reprendre des envois ou relances déjà en attente. Vérifier la configuration privée et les files d’envoi avant son redémarrage. La simulation fonctionne indépendamment de ce service et sans appel à Gemini.
