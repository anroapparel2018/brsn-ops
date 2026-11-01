# Rapport du matin — dimanche 1er novembre 2026

Bon matin Julien ! L'app est en ligne : **https://brsn-ops.vercel.app** (ouvre-la depuis l'icône BRSN OPS de ton iPhone).

## ✅ Ce qui marche
- **À faire** (2e onglet) : tes 36 dossiers et rappels sont déjà dedans, classés Urgent / Aujourd'hui / Cette semaine / Plus tard / À déléguer, chacun avec son agent. Vue **⚡ Maintenant** : une seule tâche à la fois. Boutons **Fait ✅** et **Reporter**.
- **Rappels récurrents** : paie (lundi/jeudi aux 2 semaines), point urgences (mercredi 10 h), tri du POOL (vendredi 10 h), documentation (1er lundi), RMC (vers le 10), DIE-ON (trimestriel). Quand tu fais « Fait », le suivant se crée tout seul.
- **Bannière rouge** en haut de l'app dès qu'un rappel arrive.
- **Bouton orange « + Note »** sur tous les écrans : tu dictes ou tu écris, et le Cerveau propose d'en faire une tâche, un rappel ou une décision.
- **Accueil** : parler au Cerveau, tes 3 priorités, les rappels du jour, les échéances, les approbations, les alertes, le compte à rebours (Black Friday, Salon de la femme, hoodies…), le calendrier des promos, l'objectif 3 M$ (saisie manuelle) et le **bilan de fin de journée**.
- **Le Cerveau et chaque agent** ont leur conversation (écrit + 🎤), avec leurs instructions dans `docs/agents/`. Ils peuvent **créer des tâches, des rappels et des notes** dans l'app.
- **Approbations** (3e onglet, pastille rouge quand quelque chose attend) : Approuver / À changer, commentaire, 📷 photo, filtres par agent, historique. 3 exemples sont là pour tester.
- **Agents** (4e onglet) : un écran par agent avec son outil principal, ses dossiers, ses fiches et ses anciens outils. Tes **35 anciens outils** fonctionnent dans l'app et enregistrent maintenant leurs données dans Supabase (elles te suivent d'un appareil à l'autre).
- **Fiches** déjà remplies : 10 fournisseurs, 9 partenaires, l'équipe, les sites, les guides de marque, le paiement des hoodies. Ajout et modification en un toucher.
- **Recherche** et **Réglages** (profil, mode sombre/clair, coût de Claude du mois, état des branchements, notifications) : dans le menu Agents.
- Sécurité : chaque nouvelle table n'est accessible qu'à ton compte. Aucune clé secrète dans le code ni sur GitHub.

## 🔌 À brancher (avec toi)
Shopify, QuickBooks, Outlook, Meta, TikTok Ads, Google Drive, Slack, courriel SMTP. Les écrans affichent « À brancher » : rien n'est envoyé, payé ou publié ailleurs.

## 🧭 Décisions prises cette nuit
Voir `docs/decisions-de-nuit.md`. En bref : anciens outils ouverts tels quels (fonctionnement gardé à 100 %) avec un pont vers Supabase et Claude ; Sonnet 5.5 pour les conversations, Haiku 5.5 pour trier les notes ; aucune date d'échéance inventée ; prochaine paie supposée le lundi 2 novembre (à corriger si besoin).

## ⚠️ Problèmes
- Le Cerveau ne répond pas encore en ligne : la clé Anthropic doit être ajoutée dans Vercel (étape 2 ci-dessous).
- La clé Anthropic a été affichée dans la conversation hier : elle doit être remplacée.
- `docs/memoire-julien.md` et 2 anciens outils sont introuvables.
- Je n'ai pas pu tester les écrans connectés à ta place (je n'ai pas ton mot de passe, et c'est bien ainsi) : j'ai vérifié la construction, la sécurité et les données directement dans Supabase. Dis-moi tout ce qui cloche.

## 🎯 Les 5 prochaines étapes
1. Remplacer la clé Anthropic, puis ajouter `ANTHROPIC_API_KEY`, `VAPID_PRIVATE_KEY` et `CRON_SECRET` dans Vercel (détails dans `docs/a-faire-avec-julien.md`).
2. Changer ton mot de passe et supprimer la requête « Untitled query » dans Supabase.
3. Sur l'iPhone : Réglages → 🔔 Activer les notifications, puis « Envoyer un test ».
4. Corriger les descriptions des agents et me donner `memoire-julien.md` pour rendre le Cerveau plus précis.
5. Choisir le premier branchement (je suggère Shopify : ventes réelles, objectif 3 M$ et promos).
