# Audit de BRISSON OPS — 1er novembre 2026

Branche : `refonte-majeure`. Rien n'a changé en production pendant l'audit.

## 1. Sauvegarde
- Copie complète des 16 tables dans le schéma **`sauvegarde_20261101`** de la base de production (mêmes nombres de lignes), plus la liste des 28 règles de sécurité (RLS) et des 6 fonctions. Ce schéma n'est pas exposé par l'API.
- La structure complète est aussi dans `supabase/migrations/` (Git).
- ⚠️ Le forfait gratuit de Supabase n'a pas de sauvegarde automatique quotidienne. À décider : forfait Pro (25 $ US/mois) pour les sauvegardes automatiques.

## 2. Carte de l'app

**Pile** : Next.js 16 (App Router, Cache Components), TypeScript, Tailwind 4, Supabase (Postgres, Auth, Storage, pg_cron, Vault), Vercel (Hobby), API Anthropic (Sonnet 5.5, Haiku 5.5), Google Agenda.

**Écrans** (`src/app/(app)/`) : Accueil (Cerveau), À faire, Agenda (Jour / Semaine / Mois), Approbations, Agents (9 écrans + 35 anciens outils en plein écran), Recherche, Réglages. Hors session : Connexion, `auth/callback`, `google-branche`.

**Routes API** : `/api/claude` (outils → Claude), `/api/outils/db` et `/api/outils/fichiers` (pont des anciens outils), `/api/google/connexion` et `/retour`, `/api/agenda/synchro` (appelée par pg_cron aux 15 min), `/api/push/rappels` (cron Vercel, 1 fois par jour).

**Tables** (16) : approbations, alertes, priorites, messages_agents, taches, notes, usage_ia, outils_donnees, reglages, fiches, push_abonnements, secrets_internes, google_comptes, evenements, agenda_demandes, google_etats.

**Agents** : 10, définis dans le code (`src/lib/agents.ts`), avec leurs instructions dans `docs/agents/*.md`.

**Variables d'environnement** (noms seulement) :

| Variable | Production | Aperçu (preview) |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY | ✅ | ✅ (prod — sera remplacée par la base de test) |
| ANTHROPIC_API_KEY | ✅ | ❌ |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / JETONS_CLE | ✅ | ❌ |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | ✅ | ✅ |
| VAPID_PRIVATE_KEY / CRON_SECRET | ✅ | ❌ |
| SUPABASE_SECRET_KEY | ❌ (vide, inutile) | ❌ |

## 3. Problèmes trouvés

### Sécurité (à régler avant d'ajouter d'autres personnes)
1. **Pas prêt pour plusieurs personnes** : 7 tables utilisent la règle « courriel = julien@… » ; `approbations` et `alertes` laissent **toute personne connectée** tout lire et tout modifier. Dès qu'un employé aura un compte, il verrait tout. → Phase 2.
2. **Codes secrets Google affichés dans la conversation** (4). Un seul est actif. À remplacer (tâche créée pour mardi).
3. **Écran de consentement Google en mode « Test »** : Google coupe l'accès à l'agenda **tous les 7 jours**. Il faut le publier (« En production »).
4. Protection contre les mots de passe divulgués : désactivée (fonction du forfait Pro de Supabase).
5. `/api/claude` n'a pas de limite de requêtes ni de suivi des coûts par compagnie.
6. Vercel **Hobby** est réservé à un usage non commercial.

### Bogues et écrans incomplets
7. La permission Google « créer des événements » n'a pas été accordée (`peut_ecrire = false`) : le rebranchement ne s'est pas terminé.
8. **Mise en cache des instructions inefficace** : 0 jeton lu en cache, parce que les instructions sont trop courtes (sous le minimum de Claude) et que le contexte change à chaque message.
9. Réponses des agents **sans streaming** : on attend 5 à 15 secondes sans rien voir.
10. Domaine **app.anroapparel.ca** pas encore branché ; la production est `brsn-ops.vercel.app` (la synchro de l'agenda appelle cette adresse).
11. Les dates de promos et d'événements importants sont écrites dans le code (`src/lib/promos.ts`) au lieu de la base.

### Lenteurs
12. Le **proxy appelle Supabase Auth à chaque page** (`getUser`) : un aller-retour réseau de plus à chaque navigation.
13. Les fonctions Vercel tournent à **Washington (iad1)** alors que Supabase est à **Montréal (ca-central-1)** : chaque requête à la base fait l'aller-retour.
14. La mise en page relit les rappels, les approbations et les demandes d'agenda **à chaque changement d'écran**.
15. Le pont des anciens outils charge le localStorage par une **requête synchrone** au démarrage (bloque l'affichage).

### Code mort et doublons
16. `scripts/definir-mot-de-passe.mjs` (dépend d'une clé jamais fournie) ; `/auth/confirm` (connexion par code, remplacée par `/auth/callback`).
17. Doublons dans `anciens-outils/` : `creatif_photos_site_novembre (1).html`, `ecommerce_seo_standard (1).html` (déjà ignorés à l'import).
18. Liste des agents codée **deux fois** : dans le code et dans des contraintes de la base (`agent in (...)`), ce qui empêche des agents propres à chaque compagnie.

### Couleurs codées en dur
19. Quelques couleurs fixes hors thème (`bg-green-600`, `text-white`, `bg-black/60`) ; le thème BRSN est unique, pas par compagnie.

## 4. Pour passer en multi-compagnies
- Tables `compagnies`, `membres` (rôle par compagnie), `invitations`, `marques` (thème), `forfaits` (préparés, rien de facturé).
- Colonne `compagnie_id` sur les tables de données, avec ANRO Apparel par défaut pour les données existantes.
- Règles RLS basées sur l'appartenance à la compagnie ; super-administrateur = Julien.
- Compagnie active choisie dans l'app (sélecteur), vérifiée côté serveur à chaque requête.
- Agents et outils dans la base (modèles + copies par compagnie), au lieu du code.
- Thème de l'app lu depuis la marque de la compagnie active.

Voir `docs/RAPPORT.md` pour ce qui a été fait.
