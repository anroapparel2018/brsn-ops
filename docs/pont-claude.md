# Pont avec Claude

Tu parles à Claude (sur l'ordi ou sur ton iPhone), et Claude crée les choses directement dans BRSN OPS :
tâches, rappels, approbations, notes et décisions. Il peut aussi te dire ce qui attend.

## Brancher Claude (une seule fois, 2 minutes)

1. Dans BRSN OPS : **Réglages → Pont avec Claude → Créer un lien pour Claude**.
2. Touche **Copier le lien**. Il n'est montré qu'une fois. Garde-le secret comme un mot de passe.
3. Sur **claude.ai** (ordi ou navigateur) : **Réglages → Connecteurs → Ajouter un connecteur personnalisé**.
   - Nom : `BRSN OPS`
   - URL : colle le lien.
   - Ne remplis pas les champs avancés (OAuth).
4. Touche **Ajouter**. Le connecteur apparaît aussi dans l'app Claude de ton iPhone.
5. Dans une conversation, active **BRSN OPS** dans le menu des outils (bouton ⚙️ ou « + »).

Lien perdu ou partagé par erreur ? **Réglages → Révoquer**, puis crée-en un nouveau. L'ancien arrête de marcher tout de suite.

## Ce que Claude peut faire

| Outil | Ce que ça fait |
|---|---|
| `resume_du_jour` | Agenda, rappels, urgences et approbations en attente d'une compagnie |
| `lister_en_attente` | Approbations en attente, tâches à faire, notes à classer |
| `creer_tache` | Une tâche dans À faire |
| `creer_rappel` | Un rappel à une date et une heure |
| `creer_approbation` | Une demande d'approbation (rien ne part : tu décides dans l'app) |
| `creer_note` | Une note dans le journal de la compagnie |
| `creer_decision` | Une décision dans le journal |
| `mettre_a_jour_statut` | Tâche faite ou à faire ; note classée |
| `lister_organisations` | Tes compagnies |
| `lister_agents` | Les agents d'une compagnie |

**Ce que Claude ne peut pas faire** : approuver ou refuser une approbation (seulement toi, dans l'app), supprimer quoi que ce soit,
toucher une autre compagnie que les tiennes, ni écrire chez Shopify, QuickBooks, Outlook, Meta ou un autre service.

Chaque demande devient une **carte classée** (compagnie, agent, type, statut, source Claude, date) et apparaît
sur l'Accueil sous **Arrivé de Claude**. Chaque appel, réussi ou refusé, est inscrit au **journal du pont**.

## Bloc d'instructions pour tes projets Claude

Colle ce bloc dans les instructions d'un projet Claude (ou dans tes préférences) :

```
Tu es l'assistant de Julien Brisson. Tu as accès à BRSN OPS, son outil de contrôle, par le connecteur « BRSN OPS ».

- Français du Québec, tutoiement, réponses courtes. Une chose à la fois.
- Compagnies : anro (ANRO Apparel, par défaut), brsn, gestion-jb, le-studio, wide-the-brand, nobl-co, nora.
  Si ce n'est pas clair, demande laquelle. Utilise lister_organisations au besoin.
- Agents : cerveau, bras_droit, tresorier, agent_pub, studio, creatif, acheteur, ecommerce, rh, partenariats.
  Choisis l'agent le plus logique (ex. un fournisseur → acheteur, une facture → tresorier).
- Quand Julien dit « rappelle-moi », utilise creer_rappel avec la date et l'heure de Montréal.
- Tout ce qui enverrait, paierait ou publierait quelque chose à l'extérieur (courriel, pub, commande, paiement)
  devient une creer_approbation avec tous les détails pour décider. Tu ne l'envoies jamais toi-même.
- Une décision prise → creer_decision. Une idée ou une info à garder → creer_note.
- « Qu'est-ce que j'ai aujourd'hui ? » → resume_du_jour. « Qu'est-ce qui attend ? » → lister_en_attente.
- Après chaque création, confirme en une ligne : quoi, quelle compagnie, quel agent.
```

## Pour Claude Code (ordi)

```bash
claude mcp add --transport http brsn-ops https://brsn-ops.vercel.app/api/mcp --header "Authorization: Bearer TON_JETON"
```

(Ton jeton = la partie du lien après `/api/mcp/`.)

## Comment c'est sécurisé

- Le lien contient un jeton aléatoire de 256 bits. La base ne garde que son empreinte (SHA-256) : même avec la base, on ne peut pas le retrouver.
- Chaque appel passe par la fonction `pont_appel` de Supabase, qui vérifie le jeton, que tu es membre de la compagnie, puis fait l'action et l'inscrit au journal.
- Tests : `supabase/tests/pont_claude.sql` (25 tests : appels valides, refus sans jeton / faux / révoqué, isolation entre compagnies, journal).
