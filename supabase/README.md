# Atelier — activation du pilote gratuit

État : code préparé ; connexion Google / Supabase non activée tant que les étapes ci-dessous ne sont pas terminées et vérifiées. Aucun abonnement payant ni transfert de données locales n'est automatique.

## 1. Projet détenu par Jonathan

Dans Supabase : organisation Atelier, forfait **Free**, projet Atelier pilote, région Europe. Garder Enable Data API ; ne pas exposer automatiquement les nouvelles tables ; activer Automatic RLS. Conserver le mot de passe de base de données dans un gestionnaire. Il ne sert pas à configurer le site.

## 2. Installer les protections

Projet neuf : SQL Editor → nouvelle requête → exécuter le contenu de `SETUP.sql`, une seule fois. Il crée les tables privées, les fonctions contrôlées, les politiques RLS et le bucket d'images privé. Aucun accès anonyme aux données Atelier. Les appels directs d'insertion/modification/suppression sur les tables métier sont refusés au navigateur ; seules les fonctions autorisées écrivent.

Ne pas ajouter de politique « allow all » pour résoudre une erreur. Ne jamais rendre le bucket public. Les migrations sont également séparées dans `migrations/` pour un futur déploiement automatisé.

## 3. Connexion Google (distincte de Gmail)

Créer un projet Google Cloud pour Atelier, puis un client OAuth de type Web. Pour le pilote, audience externe en test, ajouter les comptes Google des testeuses autorisées. Scopes : `openid`, adresse e-mail et profil uniquement. Aucun accès Drive/Gmail.

- Origines JavaScript : `https://jdsforeal.github.io` ; pour les essais locaux `http://127.0.0.1:5173`.
- URI de retour Google : `https://<référence-projet>.supabase.co/auth/v1/callback`.
- Dans Supabase → Authentication → Sign In / Providers → Google : copier l'identifiant et le secret du client Google. Le **secret reste dans Supabase**, jamais dans GitHub ni dans le chat.
- Authentication → URL Configuration : Site URL `https://jdsforeal.github.io/atelier-local/`.
- Redirect URLs exactes : `https://jdsforeal.github.io/atelier-local/?mode=personal` et `http://127.0.0.1:5173/?mode=personal` pour le test local. Ne pas autoriser un joker global.

## 4. Configuration publique du site

Dans `public/cloud-config.js`, renseigner seulement l'URL du projet, sa clé **publishable** (ou ancienne clé anon) et `enabled:true`. Ces deux valeurs publiques peuvent figurer dans le dépôt. **Ne jamais utiliser service_role, sb_secret_, mot de passe PostgreSQL ou secret OAuth.**

Le client Supabase officiel est empaqueté et servi localement (`public/vendor/supabase.js`) ; pas de dépendance à un CDN à l'exécution. `npm ci`, puis `npm run build:vendor` pour reconstruire ; versions figées dans package-lock.json.

## 5. Essais obligatoires avant usage réel

1. Se connecter avec Google, créer le studio privé et un premier projet sans données confidentielles.
2. Fermer/reprendre la session sur un autre navigateur, vérifier le projet et les images.
3. Importer explicitement les données locales dans un studio vide après export de sauvegarde. La simulation est refusée. Les originaux locaux ne sont pas effacés.
4. Inviter une deuxième adresse Google autorisée dans le client OAuth. L'invitation se retrouve après connexion ; copier son lien si nécessaire (pas d'e-mail automatique).
5. Vérifier contribution sans budget, puis lecture budget, puis gestion des invitations avec délégation limitée. Les modifications de droits et révocations restent réservées au créateur/propriétaire pour le pilote.
6. Retirer l'accès, vérifier les requêtes, puis tenter avec un troisième compte non invité.
7. Modifier le même projet sur deux onglets : la révision concurrente doit déclencher un conflit. Exporter les changements locaux avant rechargement ; pas d'écrasement forcé automatique.
8. Couper le réseau : « Non synchronisé » doit rester visible et la fermeture de l'onglet doit avertir de modifications en attente.

## Garanties et limites du pilote

- Connexion Google PKCE ; sessions gérées par le SDK officiel. Une connexion Atelier ne donne pas accès à Gmail.
- Studio et projets privés. La propriétaire du studio et le créateur du projet gèrent les accès ; les autres personnes ne voient que les projets partagés.
- Données séparées en sections créatives, financières et demandes ; le budget est filtré côté PostgreSQL, pas simplement caché dans l'interface. Les notes libres partagées peuvent évidemment contenir des informations qu'une personne y écrit volontairement : ne pas y copier un tarif privé.
- Les noms et e-mails de l'équipe sont visibles dans le projet partagé. Le carnet global reste réservé à la propriétaire ; seules les références utiles au projet sont projetées vers l'assistante.
- Photos privées, adresses temporaires valables une heure, renouvellement lorsque l'interface est disponible. Une photo ou un document déjà téléchargé ne peut pas être révoqué à distance.
- Sauvegardes de projet atomiques avec comparaison de révisions ; historique serveur conservant l'ancienne section. Pas encore de fusion automatique de changements simultanés ni d'écran de restauration de l'historique serveur.
- Vérification périodique des accès et changements (60 secondes / retour à l'onglet) ; chaque requête est contrôlée immédiatement par la base. Le retrait ne peut effacer une page déjà chargée hors ligne.
- Images immuables ; pas encore de purge automatique des anciennes images ou de l'historique. Surveiller les quotas gratuits.
- Les changements en cours restent dans la mémoire de l'onglet ; export nécessaire avant rechargement si une synchronisation échoue. Le pilote n'est pas une application hors ligne complète.
- L'export JSON ne constitue pas une sauvegarde indépendante des fichiers du bucket : exporter aussi les images via Supabase pour une restauration complète. Le plan gratuit ne remplace pas une stratégie de sauvegarde professionnelle.
- Gmail partagé, Qonto réel, portail client et IA restent désactivés. Le droit d'envoi est préparé mais aucune session Gmail locale n'est réutilisée dans le studio connecté.

Documentation officielle :
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
