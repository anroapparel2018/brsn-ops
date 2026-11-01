# Rapport — refonte multi-compagnies (branche `refonte-majeure`)

**Aperçu à tester** : https://brsn-ops-git-refonte-majeure-julien-9245.vercel.app
(Vercel te demandera de te connecter à ton compte Vercel : c'est la protection des aperçus. L'aperçu utilise une **base de test séparée**, pas tes vraies données.)

**En 5 lignes**
1. La production (`brsn-ops.vercel.app`) n'a **pas changé**. Tout est sur la branche `refonte-majeure`, avec une base Supabase de test (`brsn-ops-test`, 0 $).
2. Ta base de production est sauvegardée (schéma `sauvegarde_20261101`, toutes les tables).
3. Fondation multi-compagnies prête : 7 compagnies, rôles super_admin / admin / employé / client, invitations, marques, agents et outils par compagnie.
4. **24 tests automatiques** prouvent qu'une compagnie ne voit jamais les données d'une autre (24/24 réussis).
5. Dans l'app : sélecteur de compagnie, thème par marque (contraste vérifié), « Mes compagnies » + assistant en 5 étapes, notifications, « Tous mes outils ».

## Performances avant / après

| Mesure | Avant | Après | Comment |
|---|---|---|---|
| Région des fonctions | Washington (iad1) | **Montréal (yul1)**, à côté de Supabase | vercel.json |
| Vérification de session à chaque page | appel réseau à Supabase Auth | **vérification locale du jeton** (getClaims) | proxy |
| Premier affichage, changement d'agent, de compagnie, d'outil, Lighthouse | non mesuré | non mesuré | ⚠️ voir « Ce qui reste » |

Je n'ai pas pu mesurer les écrans connectés : il faudrait que je me connecte avec ton compte, ce que je ne fais pas. À mesurer ensemble sur ton téléphone.

## Liste de vérification

- [x] Une compagnie ne voit jamais les données d'une autre (24 tests automatiques sur la base de test)
- [x] Build Vercel vert, TypeScript et lint sans erreur
- [x] Agenda affiché en jour, semaine, mois (déjà en production)
- [ ] Connexion, déconnexion, mot de passe oublié sur l'aperçu → à tester par toi (lien par courriel)
- [ ] Invitation reçue et acceptée → la page d'acceptation n'est pas encore faite (les invitations sont préparées en brouillon)
- [ ] Création d'une compagnie de test complète avec l'assistant → à tester par toi sur l'aperçu
- [ ] Deux compagnies aux marques opposées : ANRO (Charbon/Foyer, Fira Sans) et BRSN (orange brûlé, Archivo) sont prêtes ; à vérifier avec le sélecteur
- [ ] Changement d'agent sous les cibles → non mesuré
- [ ] Chaque outil s'ouvre depuis « Tous mes outils » → à tester
- [ ] Approbation et demande de changement, historique → fonctionne en prod ; à revérifier sur l'aperçu
- [ ] Note par la voix et le texte → fonctionne en prod ; à revérifier
- [ ] App installée sur iPhone et Android, Google en mode installé → iPhone OK en prod ; Android non testé

## Ce qui attend ton approbation (oui / non)

1. **Appliquer les 3 migrations multi-compagnies en production ?** (`20261102000000`, `…010000`, `…020000`). Elles rattachent toutes tes données actuelles à ANRO Apparel, sans rien supprimer.
2. **Fusionner `refonte-majeure` dans `main` et déployer ?** (seulement après le oui n° 1, sinon l'app de production planterait).
3. **Passer Supabase au forfait Pro (25 $ US/mois)** pour les sauvegardes automatiques quotidiennes ?
4. **Passer Vercel au forfait Pro (20 $ US/mois)** ? Le forfait gratuit est réservé à un usage non commercial et ne permet qu'une tâche planifiée par jour.
5. **Publier l'écran de consentement Google « En production »** ? Sinon Google coupe ton agenda tous les 7 jours.
6. **Réactiver les notifications push** (variable `PUSH_ACTIF=1`) ? Elles sont coupées sur la branche, comme demandé.

## Variables d'environnement

- **Aperçu (branche refonte-majeure)** : ajoutées par moi avec l'outil Vercel, sans les afficher — adresse et clé publique de la base de test, ANTHROPIC_API_KEY, JETONS_CLE.
- **Production** : rien à ajouter. Après la fusion : `PUSH_ACTIF=1` seulement si tu approuves le push.
- Manquent pour l'aperçu (volontairement) : clés Google (l'agenda ne peut pas se brancher sur l'adresse d'aperçu) et VAPID/CRON (push coupé).

## Ce qui reste, par priorité

1. **Ton test de l'aperçu** : connecte-toi avec « Recevoir un lien par courriel » (ton compte existe dans la base de test, super-administrateur de 7 compagnies).
2. **Page d'acceptation d'invitation** (lien → mot de passe ou Google → bonne compagnie) et envoi des courriels après ton OK.
3. **Réponses des agents en streaming** et limite de coût mensuelle par compagnie (la colonne existe : 50 $ par défaut ; l'arrêt doux reste à brancher).
4. **Grille des agents lue depuis la base** et page d'agent avec onglets Discussion / Outils / Historique / Réglages (les agents sont déjà copiés pour chaque compagnie dans la base).
5. Mesures de vitesse et Lighthouse avec toi, sur ton téléphone.
6. Mode hors ligne (notes gardées sans réseau), tests automatiques des parcours dans le navigateur, test Android et iPad.
7. Mot de passe oublié, photo de profil, déconnexion de tous les appareils ; page d'inscription libre (désactivée par défaut : le réglage `inscription_libre = false` existe).

## Mes questions (une à la fois, par importance)

1. Est-ce que je peux appliquer les migrations en production et fusionner, une fois que tu as essayé l'aperçu ?
