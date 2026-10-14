# Atelier sur votre Mac

Ce dossier est désormais le dossier principal du site. Il contient tout le code, les images, les documents et les tests. Aucune connexion ChatGPT n’est nécessaire.

- Double-cliquez sur **Lancer la simulation.command** : projets fictifs, dont 50 terminés.
- Double-cliquez sur **Lancer mon espace.command** : votre espace personnel existant.
- Ouvrez **Atelier.code-workspace** dans VS Code pour modifier le site.
- Gardez le terminal du serveur ouvert. Ctrl+C arrête le site.

Les deux espaces sont séparés. Les données de travail sont enregistrées dans le navigateur utilisé, pas dans ce dossier : utilisez « Exporter mes données » pour conserver une sauvegarde JSON, puis « Importer une sauvegarde » pour la retrouver ailleurs. Le changement de dossier conserve les données du même navigateur à la même adresse localhost.

Le site écoute uniquement sur ce Mac, à http://127.0.0.1:5173. Node.js doit être installé (il l’est actuellement). Aucun paquet supplémentaire nécessaire.

Vérification du code : npm run check et npm test.
