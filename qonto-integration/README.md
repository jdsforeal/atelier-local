# Préparation Qonto — version 0.9.2

Cette version prépare les données et permet un essai local illustratif sans aucun compte Qonto. Elle n'implémente pas encore l'autorisation OAuth, le transport réseau, la création réelle de clients ou de documents ni le suivi réel de facturation électronique. Aucun abonnement n'est nécessaire pour ce parcours préparatoire.

## Ce qui fonctionne maintenant

Dans Projet → Devis, la section Qonto permet de choisir les lignes facturables, renseigner le donneur d'ordre et contrôler dates, quantité, tarif et TVA. Le client alimente aussi le devis PDF. L'essai local liste les étapes futures, explicitement simulées ; il ne change pas les statuts du projet ou du devis. Une modification des données invalide cet essai.

Le modèle prépare les champs documentés par Qonto : devise EUR, dates d'émission et d'expiration, libellé, quantité décimale, prix unitaire en chaîne à deux décimales et taux de TVA sous forme fractionnaire (20 % → 0.2). Un taux non renseigné bloque la préparation. Un taux nul demande encore la vérification des motifs et des mentions dans Qonto. Les tests contrôlent ces conversions et n'effectuent aucun appel réseau.

`adapter.mjs` est un contrat de création de devis avec un transport injecté et un journal obligatoires. Il refuse une demande répétée avec un autre contenu ; une réponse ambiguë bloque les nouveaux essais. Le transport de test renvoie des réponses fictives. Le futur journal devra être durable et isolé par organisation Qonto, avec verrouillage atomique en cas de concurrence ; une simple Map n'est utilisée que dans les tests.

## À faire lorsque le compte sera disponible

1. Vérifier le pays de l'entreprise, les droits et l'accès aux fonctionnalités Qonto déjà souscrites, sans changer de forfait automatiquement.
2. Créer l'intégration dans le portail développeur et utiliser d'abord l'environnement de test Qonto. Les essais actuels sont des simulations locales, pas des tests sur la sandbox Qonto.
3. Mettre en place OAuth côté privé avec contrôle de state, organisation et session ; demander seulement les permissions client, devis et factures nécessaires. Ne pas demander de droits de virement, carte ou paiement bancaire.
4. Rapprocher le client légal avec le carnet Qonto ; présenter les correspondances ambiguës au lieu de créer des doublons. Vérifier les adresses structurées et identifiants requis par Qonto.
5. Lire la numérotation et les paramètres de facturation Qonto. Par défaut, laisser Qonto attribuer le numéro ; si sa numérotation automatique est désactivée, fournir un numéro conforme à sa configuration. Ne pas envoyer les numéros SIM ni reprendre aveuglément la référence Atelier.
6. Vérifier les motifs de TVA nulle et les éventuels taux par ligne : le préparateur actuel utilise un seul taux pour le document. Il faut traiter ces cas avant toute création réelle.
7. Créer le devis seulement après un récapitulatif validé. Aucune acceptation client ou facture définitive automatique. Une modification postérieure dans Atelier ne doit pas écraser un devis accepté dans Qonto.
8. Laisser la styliste finaliser l'accord et la facture dans Qonto pour le premier pilote. La future émission électronique nécessite notamment l'activation du compte, son inscription à l'Annuaire pour une entreprise française et l'éligibilité du destinataire. Suivre les événements d'acheminement : une requête acceptée ne signifie pas une facture effectivement livrée.
9. Tester ensuite les doublons, délais, erreurs, révocation de connexion et rapprochements des statuts avec des comptes contrôlés, avant de décider d'une activation réelle.

Les secrets et autorisations Qonto ne doivent jamais être stockés dans `public/`, le dépôt GitHub, les sauvegardes de l'espace métier ou un champ de l'interface. Prévoir un stockage privé chiffré et une révocation. Le choix d'un hébergement ou d'un autre mécanisme privé reste ouvert ; aucune solution payante n'a été activée.

Sources officielles vérifiées le 15 octobre 2026 :
- Création de devis : https://docs.qonto.com/api-reference/business-api/expense-management/client-quotes-notes/quotes/create-a-quote
- Autorisation : https://docs.qonto.com/get-started/business-api/authentication/oauth/oauth-flow
- Facturation électronique : https://docs.qonto.com/get-started/business-api/e-invoicing-standards
- Acheminement : https://docs.qonto.com/api-reference/business-api/expense-management/client-quotes-notes/client-invoices/send-a-client-invoice-by-e-invoice
