# Import de fiches produit

`npm run build:product-import` prépare le fichier autonome `supabase/functions/product-import/index.ts` à déployer sous le nom `product-import`. La source maintenable est `entry.ts`, avec le lecteur commun `fetch-product.mjs` et le modèle public.

Le handler vérifie le Bearer auprès de `/auth/v1/user` avec les variables Supabase intégrées. Aucun secret supplémentaire, service_role, base de données ou IA. Le contrôle JWT legacy du portail est désactivé uniquement pour cette fonction : son propre contrôle de session reste obligatoire. Origines permises dans entry.ts.

Activer le frontend avec `ATELIER_PRODUCT_IMPORT_ENABLED` après déploiement. Le serveur local utilise la même extraction. Les boutiques hors liste et les échecs réseau passent en lecture du lien uniquement. Le limiteur est par instance, sans garantie de quota global.

## Compatibilité

Les hôtes sont centralisés dans PRODUCT_SHOPS (modèle public). Le parseur lit JSON-LD Product/ProductGroup, métadonnées produit, données publiques ASOS et état produit Uniqlo. Aucun site ne bénéficie d’une garantie globale : les protections et pages dynamiques peuvent empêcher la lecture depuis le service. `npm run test:product-shops` contrôle les dix fiches de référence en direct ; les fixtures et cas de refus sont testés hors ligne dans la suite habituelle.
