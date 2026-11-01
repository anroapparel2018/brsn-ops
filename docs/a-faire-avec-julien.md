# À faire avec Julien

## 1. Urgent (sécurité) — 10 minutes
- **Remplacer la clé Anthropic affichée dans la conversation** : platform.claude.com → Settings → API Keys → supprimer l'ancienne, en créer une nouvelle, la coller seulement dans `.env.local` (ligne `ANTHROPIC_API_KEY=`).
- **Changer ton mot de passe** BRSN OPS (il a été tapé dans l'éditeur SQL) et effacer la requête « Untitled query » dans Supabase.

## 2. Ajouter 3 valeurs secrètes dans Vercel (je ne dois pas les voir)
Vercel → projet **brsn-ops** → Settings → Environment Variables → Add, type **Sensitive**, pour Production :
1. `ANTHROPIC_API_KEY` : ta nouvelle clé. Sans elle, le Cerveau et les agents affichent « clé manquante ».
2. `VAPID_PRIVATE_KEY` : copie la valeur depuis `.env.local` (Bloc-notes). Sert aux notifications.
3. `CRON_SECRET` : copie la valeur depuis `.env.local`. Sert à l'envoi des rappels du matin.

Ensuite : Deployments → ⋯ → Redeploy (ou dis-le-moi et je relance).

## 3. À brancher (rien n'est envoyé ailleurs sans toi)
- Shopify (ventes réelles pour l'objectif 3 M$, promos), QuickBooks (Trésorier, paie), Outlook (courriels du Bras droit), Meta et TikTok Ads (Agent Pub), Google Drive, Slack.
- Service de courriel (SMTP) pour Supabase : enlève la limite de 2 courriels par heure.
- Dans les anciens outils, les étapes « Drive » et « Meta » du Studio Pub restent manuelles (téléchargement) en attendant.

## 4. Limites connues
- **Notifications** : sur iPhone, il faut ouvrir l'app depuis l'icône de l'écran d'accueil, aller dans Réglages → 🔔 Activer. Le forfait gratuit de Vercel permet une seule tâche planifiée par jour : tu reçois **un résumé des rappels du jour à 7 h**. Les rappels à l'heure exacte s'affichent en **bannière rouge** dès que tu ouvres l'app.
- **Dictée sur iPhone (app installée)** : si le bouton 🎤 ne capte rien, utilise le 🎤 du clavier. La transcription d'enregistrements audio demande un service de plus (l'API Claude ne transcrit pas l'audio) : à décider ensemble.
- **Réponses en streaming** : pas encore ; la réponse s'affiche d'un coup (quelques secondes).
- **Anciens outils** : ils gardent leur look d'origine dans l'app. Les refaire au look BRSN est une prochaine étape.
- **Vercel Hobby** est réservé à un usage non commercial : passer à Pro (environ 20 $ US/mois) avant d'ajouter l'équipe.

## 5. Fichiers à me donner
- `docs/memoire-julien.md` (introuvable dans le projet).
- `agentpub_pubs_automne.html` et `partenariats_dieon_rapport_entente.html` (absents de `anciens-outils/`).
- Rôles et horaires de l'équipe (Dominick, Frédéric, autres) pour compléter les fiches RH.
