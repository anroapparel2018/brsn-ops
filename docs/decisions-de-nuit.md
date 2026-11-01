# Décisions prises pendant la nuit (1er novembre 2026)

Chaque fois que j'ai dû choisir sans toi, j'ai pris l'option la plus simple et la plus sûre. Tout est modifiable.

1. **docs/memoire-julien.md n'existait pas** dans le projet. J'ai utilisé à la place ce que tu m'as écrit dans tes messages (dossiers en attente, équipe, partenaires, fournisseurs, promos). Je n'ai rien inventé sur toi.
2. **Fichiers manquants** : `agentpub_pubs_automne.html` et `partenariats_dieon_rapport_entente.html` ne sont pas dans `anciens-outils/`. Leurs places sont prêtes dans l'app ; dépose les fichiers et je les branche.
3. **Doublons ignorés** : `creatif_photos_site_novembre (1).html` et `ecommerce_seo_standard (1).html` sont identiques aux originaux.
4. **Anciens outils** : pour garder leur fonctionnement et leur contenu à 100 %, chaque outil s'ouvre tel quel dans l'app (plein écran), avec un « pont » qui remplace les fonctions Claude :
   - `db` (base de données des artefacts) → table Supabase `outils_donnees` ;
   - `localStorage` → copié automatiquement dans Supabase (tes choix te suivent d'un appareil à l'autre) ;
   - `assets` (photos, fichiers) → Supabase Storage, dossier privé `fichiers-outils` ;
   - `sample` (Claude) → route serveur `/api/claude` (Sonnet 5.5, Haiku 5.5 pour les petites tâches).
   Leur look reste celui d'origine pour l'instant ; l'habillage BRSN autour (barre, titres, boutons) est en place. Refaire chaque outil au look BRSN est une prochaine étape.
5. **Modèles** : Claude Sonnet 5.5 pour les conversations et analyses, Claude Haiku 5.5 pour les petites tâches (trier une note, résumer court). Mise en cache des instructions activée. Chaque appel enregistre ses jetons et son coût estimé dans la table `usage_ia`.
6. **Sécurité des nouvelles tables** : accès réservé à ton compte (julien@anroapparel.ca), vérifié par Supabase (RLS).
7. **Dates** : aucune date d'échéance par défaut. J'ai mis une date seulement quand tu l'avais donnée (ex. 23 nov., 1er déc.). Les rappels suggérés tombent surtout cette semaine, à 9 h, pour que tu les revoies.
8. **Rappels récurrents** : quand tu touches « Fait ✅ » sur un rappel récurrent, le suivant se crée tout seul (hebdomadaire, aux 2 semaines, mensuel, trimestriel, 1er lundi du mois). Pour la paie aux 2 semaines, j'ai supposé que la prochaine approbation est le lundi 2 novembre : corrige si c'est la semaine suivante.
9. **Heure** : tout est à l'heure du Québec. Attention, on passe à l'heure normale cette nuit (2 h → 1 h).
