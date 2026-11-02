# Décisions — refonte « outil de contrôle + pont Claude »

1. **Discussions et micro retirés de l'app.** On parle maintenant directement dans Claude. Les anciennes conversations
   restent dans la base, en lecture seule (`messages_agents.archive_le`, écriture retirée). La clé Anthropic sert encore
   seulement au classement automatique des notes.
2. **Bilan de fin de journée retiré** (c'était une discussion avec le Cerveau). Claude le fait avec `resume_du_jour`.
3. **Note rapide gardée, en texte seulement.**
4. **Authentification du pont : jeton personnel dans le lien plutôt qu'OAuth.** OAuth demanderait d'écrire un serveur
   d'autorisation complet (enregistrement de clients, codes, rafraîchissement). Le connecteur personnalisé de claude.ai
   accepte une adresse avec un jeton : ça marche sur l'ordi et l'iPhone, c'est révocable en un clic et seule l'empreinte
   est gardée. OAuth pourra remplacer le jeton plus tard sans changer les outils.
5. **Toute la logique du pont est dans Supabase** (`pont_appel`, sécurité définie), pas dans Vercel : pas de clé
   « service » à garder, et l'isolation entre compagnies est vérifiée par la base elle-même.
6. **Claude ne peut pas décider une approbation.** Il peut en créer, mais approuver reste dans l'app : c'est le point de
   contrôle (et ça évite qu'un texte lu par Claude fasse approuver quelque chose).
7. **Compagnie par défaut : ANRO**, agent par défaut : le Cerveau, si Claude ne précise pas.
8. **Cartes = journal du pont.** Chaque création réussie est une ligne du journal (compagnie, agent, type, titre, date),
   affichée sur l'Accueil sous « Arrivé de Claude ». L'élément lui-même est dans sa table habituelle (source « claude »).
9. **Flèche retour** ajoutée en haut de chaque écran (sauf l'Accueil), à la demande de Julien.

## Page d'accueil (branche `accueil`, base de test seulement)

10. **POOL ClickUp = la liste « 📥 À TRIER (boîte de réception) »** (901421797778). Elle n'a pas de statut « À TRIER » :
    une alerte acceptée y devient une tâche au statut de départ « to do », sans date limite.
11. **Supprimer ne supprime rien.** Dans l'app, l'élément est archivé (récupérable dans l'Historique). Dans ClickUp, la
    tâche reçoit l'étiquette « archivé brsn ops » et sort des priorités ; elle n'est ni fermée ni effacée.
12. **Accepter une tâche ClickUp** la passe à « in progress » ; **Reporter** met sa date limite au jour choisi, 9 h.
13. **Priorités calculées** : urgence (en retard, aujourd'hui, marquée urgente) puis impact (argent, clients, employés,
    reconnus par des mots clés du titre). Les éléments reportés à aujourd'hui sont à part, tout en haut.
14. **Tâches urgentes** : seulement celles marquées urgentes ou dont l'échéance est arrivée (l'ancien « 31 » comptait
    toutes les tâches). Le mot « Rappel » n'apparaît que si le rappel tombe aujourd'hui.
15. **Bouton « + Note » retiré** de l'app (les demandes passent par Claude).
16. **Approbation reportée** : elle quitte « Ce qui attend ton OK » et revient en haut le jour choisi ; Accepter la remet
    dans la liste pour décider.
