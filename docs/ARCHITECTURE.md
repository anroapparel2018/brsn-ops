# Comment BRISSON OPS est construite (version simple)

## Les morceaux
- **L'app** (Next.js) : ce que tu vois sur ton téléphone. Elle tourne chez **Vercel**, à Montréal.
- **La base de données** (Supabase, Montréal) : tâches, notes, approbations, agents, outils, compagnies…
- **Claude** (API Anthropic) : le cerveau des agents. Appelé seulement par le serveur ; la clé ne quitte jamais Vercel.
- **Google Agenda** : lu par l'app ; une demande d'événement n'est écrite qu'après ton OK.

## Plusieurs compagnies dans la même app
- Chaque ligne de données porte l'identifiant de sa **compagnie**.
- La base elle-même (règles « RLS ») refuse de montrer une ligne à quelqu'un qui n'est pas membre de cette compagnie. Même un bogue dans l'app ne peut pas contourner ça.
- **Rôles** : super_admin (toi, partout), admin (sa compagnie), employé (ses agents et outils), client (seulement ce qu'on partage avec lui).
- La **compagnie active** est choisie en haut de l'écran. Le serveur revérifie à chaque requête que tu en es membre, et filtre toutes les lectures et écritures par cette compagnie (`src/lib/compagnie.ts`).

## Image de marque
- Chaque compagnie a un **profil de marque** (couleurs, polices, voix).
- Le **moteur de thème** (`src/lib/theme.ts`) transforme ces couleurs en variables de l'app et corrige automatiquement une couleur illisible (contraste 4,5:1).
- Les **couleurs de statut** (rouge urgent, orange production, rose rendez-vous, vert contenu, bleu admin, violet systèmes, jaune personnel) ne changent jamais.

## Agents et outils
- **Modèles d'agents** : les 10 agents de base. Quand on crée une compagnie, on en copie un, plusieurs ou tous ; chaque compagnie peut ajuster les siens sans toucher aux autres.
- **Registre des outils** : un seul endroit pour décrire chaque outil (nom, catégorie, icône, lien, rôles permis). Ajouter un outil = une ligne.
- Les **35 anciens outils** (artefacts) s'ouvrent tels quels dans l'app, grâce à un « pont » qui range leurs données dans Supabase.

## Sécurité en bref
- Aucune clé secrète dans le code ni sur GitHub : seulement dans `.env.local` (ton ordi) et dans Vercel.
- Toute action qui modifie quelque chose à l'extérieur (Google, et plus tard Shopify, QuickBooks…) passe par une approbation.
- Tests automatiques des droits : `supabase/tests/rls_matrice.sql`.
