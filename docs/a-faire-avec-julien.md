# À faire avec Julien

## Urgent (sécurité)
- **Clé Anthropic affichée dans la conversation** : la supprimer dans platform.claude.com → Settings → API Keys, en créer une nouvelle, la coller seulement dans `.env.local` (ligne `ANTHROPIC_API_KEY=`).
- **Ajouter `ANTHROPIC_API_KEY` dans Vercel** (projet brsn-ops → Settings → Environment Variables, type « Sensitive »). Sans elle, le Cerveau et les agents affichent « clé manquante » au lieu de répondre. Je ne peux pas le faire : je ne dois jamais voir la clé.

## À brancher (rien n'est envoyé ailleurs sans toi)
- Shopify, QuickBooks, Outlook, Meta, TikTok, Google Drive, Slack : les écrans ont un bouton « À brancher ».
- Service de courriel (SMTP) pour Supabase : enlève la limite de 2 courriels par heure.
- Outils des anciens artefacts qui appelaient des outils externes (mcp) : boutons « À brancher ».

## Fichiers à me donner
- `docs/memoire-julien.md` (introuvable dans le projet).
- `agentpub_pubs_automne.html` et `partenariats_dieon_rapport_entente.html` (absents de `anciens-outils/`).
