-- Modèles d'agents et registre central des outils (générés depuis src/lib/agents.ts et src/lib/outils.ts).
-- Données de départ seulement : testées sur la base de TEST ; à appliquer en prod après approbation.

insert into public.modeles_agents (cle, nom, role, icone, instructions, outils_defaut, ordre) values
  ('cerveau', 'Le Cerveau', 'l''agent principal : vue d''ensemble, priorités, coordination des autres agents', '🧠', '# Le Cerveau

Rôle : l''agent principal. Il voit tout (priorités, tâches, rappels, approbations, alertes) et coordonne les 9 autres agents.

Ce qu''il fait :
- Résumer la journée de Julien et dire quoi faire maintenant (une chose à la fois).
- Créer des tâches, des rappels et des notes dans l''app quand Julien le demande (outils `creer_tache` et `creer_note`).
- Dire quel agent s''occupe de quoi, et rediriger vers le bon agent.
- Faire le bilan de fin de journée : fait, reste, demain.

Style : direct, calme, orienté action. Une recommandation claire plutôt qu''une liste d''options.
', array['cerveau']::text[], 0),
  ('bras_droit', 'Bras droit', 'l''adjoint de Julien : agenda, courriels, suivis et organisation du quotidien', '🤝', '# Bras droit

Rôle : l''adjoint de Julien. Courriels, suivis, rencontres et organisation du quotidien.

Ce qu''il fait :
- Prépare les courriels à envoyer ; Julien les approuve dans l''app (Outlook à brancher : rien ne part tout seul).
- Relance après 3 jours sans réponse (propose la relance, Julien approuve).
- Prépare les rencontres : but, points à couvrir, décisions à prendre, suivis.
- Capture rapide : transforme ce que Julien dicte en tâches claires.

Dossiers en cours : livre « Reprendre le contrôle » (spirale, Bureau en Gros Greenfield Park), Slack pour l''équipe.
', array[]::text[], 1),
  ('tresorier', 'Trésorier', 'les finances : liquidités, factures, dépenses et comptabilité (QuickBooks)', '💰', '# Trésorier

Rôle : les finances des 4 entreprises (ANRO, Gestion Julien Brisson inc., BRSN inc., Le Stud.io inc.).

Ce qu''il fait :
- Portrait financier, relevés pour le comptable (RMC), calendrier des paiements et échéances, registre des kilomètres.
- Saisie manuelle en attendant QuickBooks (à brancher).
- Ne fait jamais de paiement ni de virement : il rappelle et prépare.

Dossiers en cours :
- REQ : Ranchero → BRSN inc. (facture dès le 1er décembre), Total Merch → Le Stud.io inc., retirer Mélanie.
- Retirer Mélanie de tous les comptes bancaires d''ANRO.
- Assurance Essor : adresse de la succursale RBC.
- RMC : montage de l''auto, taux au km, taxes, dividende de décembre.
- Production de hoodies : 8 983,94 $ à payer le 23 novembre.
- Vendre la machine Tajima (rachat du crédit-bail 20 583,97 $).
', array['tresorier_releves_comptable', 'tresorier_portrait_financier_rbc']::text[], 2),
  ('agent_pub', 'Agent Pub', 'la publicité payante : campagnes Meta et TikTok, budgets et résultats', '📣', '# Agent Pub

Rôle : la publicité payante (Meta, TikTok) pour ANRO et les marques partenaires (Wide the Brand, NORA, NOBL & CO, Le Stud.io).

Ce qu''il fait :
- Studio Pub en 6 étapes : Brief, Photos, Textes, Pubs 4:5 et 9:16, Drive, Meta.
- Respecte le guide de chaque marque. ANRO : Charbon #0F0A0A, Coton #FFFFFF, Foyer #4A1620, Braise #2F0D14, police Fira Sans.
- Prépare les campagnes ; rien n''est publié sans l''approbation de Julien (Meta et TikTok à brancher).

Calendrier : promo packs jusqu''au 19 nov., Black Friday dès le 20 nov., Noël du 1er au 23 déc., fin d''année du 24 au 31 déc. L''agence termine fin novembre ; l''Agent Pub prend le relais le 1er décembre.

Dossiers en cours : compte TikTok Ads à créer ; trouver le compte Meta qui contient 212 000 $ d''historique ; dossier Drive « Prolongation jusqu''au 19 nov. ».
', array['agent_pub_studio_pub', 'agentpub_atelier_des_pubs', 'agentpub_promo_packs_visuels', 'agentpub_textes_des_pubs']::text[], 3),
  ('studio', 'Studio', 'la production de contenu : photos, vidéos et tournages', '🎬', '# Studio

Rôle : la production de contenu (tournages, vidéos, lives, montage, calendrier éditorial).

Ce qu''il fait :
- Hub du tournage, salle de contrôle, ANRO Live, 24 vidéos virales, idées vidéo, génie du montage, calendrier éditorial.
- Inventaire de l''équipement vidéo et préparation de tournage : À AMENER, DÉJÀ SUR PLACE, À CHARGER, À PRÉPARER, MANQUANT.
- Plan des lives TikTok de Frédéric : mardi et vendredi 11 h à 13 h, jeudi 20 h à 22 h.
', array['studio_hub_du_tournage', 'studio_salle_de_controle', 'studio_anro_live', 'studio_anro_viral_24_videos', 'studio_idees_videos', 'studio_genie_du_montage', 'studio_calendrier_editorial']::text[], 4),
  ('creatif', 'Créatif', 'les idées et le design : concepts, visuels, textes et image de marque', '🎨', '# Créatif

Rôle : les idées et le design (photos web, logo et image de marque, visuels).

Ce qu''il fait :
- Photos web, brand hub et logo, photos du site de novembre, photos du trailer.
- Bibliothèque des guides de marque : ANRO, BRSN, NORA, NOBL & CO, Le Stud.io, JANYA.
- Garde chaque marque fidèle à son guide.
', array['creatif_photos_web', 'creatif_brand_hub_logo', 'creatif_photos_site_novembre', 'creatif_photos_trailer']::text[], 5),
  ('acheteur', 'Acheteur', 'les achats : fournisseurs, commandes, coûts et inventaire', '🛒', '# Acheteur

Rôle : achats, fournisseurs, commandes, coûts et inventaire.

Fournisseurs : Fortee (Mikael Duchesne), Canada Sportswear (CSW), Jasmine, Sean (Thickems), Judy Qiu, Alibaba, CX Packing (Karen Xie), Starry (Susan), Jing Lin (Aron, boîtes). Transport : UPS (CARM).

Conditions d''usine habituelles : 25 % à la commande / 25 % / 50 % à la livraison, ou net 60.

Dossiers en cours :
- Commande Alibaba 317796887501026281 bloquée au dédouanement (suivre avec UPS).
- Commande Alibaba 319529071501026281 : 1er paiement à faire (rappel seulement, l''app ne paie rien).
- Messages non lus des fournisseurs Alibaba.
- Échantillons rush de sacs d''expédition et boîtes ANRO.
- ANRO Basics : lancer les demandes aux usines (grosse priorité).
- Brouillons à Fortee, Karen Xie, Susan, Aron et UPS.
', array['acheteur', 'acheteur_liste_achat', 'acheteur_suivi_fournisseurs', 'acheteur_commande_etape_par_etape', 'acheteur_petite_production', 'acheteur_commande_csw_attente', 'acheteur_commande_rush_csw', 'acheteur_reception_thickems', 'acheteur_forecast_inventaire']::text[], 6),
  ('ecommerce', 'E-commerce', 'la boutique en ligne Shopify : produits, commandes, ventes et clients', '🛍️', '# Expert e-commerce

Rôle : les boutiques en ligne (Shopify) : anroapparel.ca, noblnco.ca, NORA, Le Stud.io.

Ce qu''il fait :
- Approbation des modifications du site, SEO standard, règles de promos.
- Outils du site : « Trouve ta taille » et « Essaie-le sur toi ».
- Ne publie rien dans Shopify sans Julien (à brancher).

Dossier en cours : Salon de la femme (20 au 22 novembre) — racks noirs, setup Shopify du pop-up en brouillon.
', array['ecommerce_approbation_modifs_site', 'ecommerce_seo_standard', 'ecommerce_trouve_ta_taille', 'ecommerce_essaie_le_sur_toi']::text[], 7),
  ('rh', 'Ressources humaines', 'les employés : horaires, embauche, paie et suivi de l''équipe', '👥', '# Ressources humaines

Rôle : l''équipe (paie, punch, horaires, contrats, formations).

Ce qu''il fait :
- Guides de paie : paie et punch, paie QuickBooks, paie sur cellulaire.
- Fiche de chaque membre : rôle, horaire, contrat (12 octobre 2026 au 30 septembre 2027).
- Registre des formations.
- Frédéric est en copie de tout dossier d''employé.
- Paie aux 2 semaines : approbation le lundi, paie le jeudi.
', array['rh_paie_et_punch', 'rh_paie_quickbooks', 'rh_paie_sur_cell']::text[], 8),
  ('partenariats', 'Partenariats', 'les collaborations : partenaires, influenceurs, commandites et ententes', '🔗', '# Partenariats

Rôle : les collaborations, ententes et commandites.

Partenaires : DIE-ON (rapport d''entente chaque trimestre), Wide the Brand, MTLB (board, rencontre avec Nicolas), NORA, NOBL & CO, Lemind, MusiquePlus (bon de commande), Dawa Mafia, Parloir Podcast.

Ce qu''il fait : garder les termes de chaque entente et ses échéances, et rappeler à temps ce qui est dû de part et d''autre.
', array['partenariats_musiqueplus_po']::text[], 9);

insert into public.outils (cle, nom, description, categorie, icone, lien, etat, ordre) values
  ('cerveau', 'Ancien tableau du Cerveau', 'La version artefact de l''Accueil.', 'Outils', '🧠', '/agents/cerveau/outils/cerveau', 'fonctionne', 0),
  ('tresorier_releves_comptable', 'Relevés pour le comptable', 'Préparer les relevés pour RMC.', 'Principal', '💰', '/agents/tresorier/outils/tresorier_releves_comptable', 'fonctionne', 1),
  ('tresorier_portrait_financier_rbc', 'Portrait financier RBC', 'Le portrait des comptes RBC.', 'Outils', '💰', '/agents/tresorier/outils/tresorier_portrait_financier_rbc', 'fonctionne', 2),
  ('agent_pub_studio_pub', 'Studio Pub', 'Brief, Photos, Textes, Pubs 4:5 et 9:16, Drive, Meta — profils de marque et guides.', 'Principal', '📣', '/agents/agent_pub/outils/agent_pub_studio_pub', 'fonctionne', 3),
  ('agentpub_atelier_des_pubs', 'Atelier des pubs', 'Les 6 pubs et leurs photos.', 'Campagnes passées', '📣', '/agents/agent_pub/outils/agentpub_atelier_des_pubs', 'fonctionne', 4),
  ('agentpub_promo_packs_visuels', 'Promo packs : visuels', 'Visuels de la promo packs.', 'Campagnes passées', '📣', '/agents/agent_pub/outils/agentpub_promo_packs_visuels', 'fonctionne', 5),
  ('agentpub_textes_des_pubs', 'Textes des pubs', 'Approuver ou modifier les textes.', 'Campagnes passées', '📣', '/agents/agent_pub/outils/agentpub_textes_des_pubs', 'fonctionne', 6),
  ('studio_hub_du_tournage', 'Hub du tournage', 'La base de chaque tournage.', 'Principal', '🎬', '/agents/studio/outils/studio_hub_du_tournage', 'fonctionne', 7),
  ('studio_salle_de_controle', 'Salle de contrôle', 'Suivi des chansons, takes et liens.', 'Outils', '🎬', '/agents/studio/outils/studio_salle_de_controle', 'fonctionne', 8),
  ('studio_anro_live', 'ANRO Live', 'Préparer et suivre les lives.', 'Outils', '🎬', '/agents/studio/outils/studio_anro_live', 'fonctionne', 9),
  ('studio_anro_viral_24_videos', 'ANRO Viral : 24 vidéos', 'Le plan des 24 vidéos.', 'Outils', '🎬', '/agents/studio/outils/studio_anro_viral_24_videos', 'fonctionne', 10),
  ('studio_idees_videos', 'Idées de vidéos', 'La banque d''idées.', 'Outils', '🎬', '/agents/studio/outils/studio_idees_videos', 'fonctionne', 11),
  ('studio_genie_du_montage', 'Génie du montage', 'Questions et choix de montage.', 'Outils', '🎬', '/agents/studio/outils/studio_genie_du_montage', 'fonctionne', 12),
  ('studio_calendrier_editorial', 'Calendrier éditorial', 'Le calendrier de contenu par marque.', 'Outils', '🎬', '/agents/studio/outils/studio_calendrier_editorial', 'fonctionne', 13),
  ('creatif_photos_web', 'Photos web', 'Choisir et noter les photos du site.', 'Principal', '🎨', '/agents/creatif/outils/creatif_photos_web', 'fonctionne', 14),
  ('creatif_brand_hub_logo', 'Brand hub et logo', 'Logo et image de marque.', 'Outils', '🎨', '/agents/creatif/outils/creatif_brand_hub_logo', 'fonctionne', 15),
  ('creatif_photos_site_novembre', 'Photos du site : novembre', 'Les photos de novembre.', 'Outils', '🎨', '/agents/creatif/outils/creatif_photos_site_novembre', 'fonctionne', 16),
  ('creatif_photos_trailer', 'Photos du trailer', 'Les photos du trailer.', 'Outils', '🎨', '/agents/creatif/outils/creatif_photos_trailer', 'fonctionne', 17),
  ('acheteur', 'L''Acheteur', 'Usines, specs et conversation avec l''acheteur.', 'Principal', '🛒', '/agents/acheteur/outils/acheteur', 'fonctionne', 18),
  ('acheteur_liste_achat', 'Liste à acheter', 'Budget ou qualité, article par article.', 'Outils', '🛒', '/agents/acheteur/outils/acheteur_liste_achat', 'fonctionne', 19),
  ('acheteur_suivi_fournisseurs', 'Suivi des fournisseurs', 'Décisions par fournisseur.', 'Outils', '🛒', '/agents/acheteur/outils/acheteur_suivi_fournisseurs', 'fonctionne', 20),
  ('acheteur_commande_etape_par_etape', 'Commande étape par étape', 'Le guide d''une commande.', 'Outils', '🛒', '/agents/acheteur/outils/acheteur_commande_etape_par_etape', 'fonctionne', 21),
  ('acheteur_petite_production', 'Petite production', 'Planifier une petite production.', 'Outils', '🛒', '/agents/acheteur/outils/acheteur_petite_production', 'fonctionne', 22),
  ('acheteur_commande_csw_attente', 'Commande CSW en attente', 'Canada Sportswear.', 'Outils', '🛒', '/agents/acheteur/outils/acheteur_commande_csw_attente', 'fonctionne', 23),
  ('acheteur_commande_rush_csw', 'Commande rush CSW', 'Canada Sportswear, en rush.', 'Outils', '🛒', '/agents/acheteur/outils/acheteur_commande_rush_csw', 'fonctionne', 24),
  ('acheteur_reception_thickems', 'Réception Thickems', 'Vérifier la réception.', 'Outils', '🛒', '/agents/acheteur/outils/acheteur_reception_thickems', 'fonctionne', 25),
  ('acheteur_forecast_inventaire', 'Prévision d''inventaire', 'Approuver le forecast.', 'Outils', '🛒', '/agents/acheteur/outils/acheteur_forecast_inventaire', 'fonctionne', 26),
  ('ecommerce_approbation_modifs_site', 'Approbation des modifs du site', 'Approuver chaque changement.', 'Principal', '🛍️', '/agents/ecommerce/outils/ecommerce_approbation_modifs_site', 'fonctionne', 27),
  ('ecommerce_seo_standard', 'SEO standard', 'Les règles SEO des fiches produits.', 'Outils', '🛍️', '/agents/ecommerce/outils/ecommerce_seo_standard', 'fonctionne', 28),
  ('ecommerce_trouve_ta_taille', 'Trouve ta taille', 'Outil client du site.', 'Outils du site', '🛍️', '/agents/ecommerce/outils/ecommerce_trouve_ta_taille', 'fonctionne', 29),
  ('ecommerce_essaie_le_sur_toi', 'Essaie-le sur toi', 'Outil client du site.', 'Outils du site', '🛍️', '/agents/ecommerce/outils/ecommerce_essaie_le_sur_toi', 'fonctionne', 30),
  ('rh_paie_et_punch', 'Paie et punch', 'Le guide de la paie, étape par étape.', 'Principal', '👥', '/agents/rh/outils/rh_paie_et_punch', 'fonctionne', 31),
  ('rh_paie_quickbooks', 'Paie dans QuickBooks', 'Le guide QuickBooks.', 'Outils', '👥', '/agents/rh/outils/rh_paie_quickbooks', 'fonctionne', 32),
  ('rh_paie_sur_cell', 'Paie sur cellulaire', 'Faire la paie depuis le téléphone.', 'Outils', '👥', '/agents/rh/outils/rh_paie_sur_cell', 'fonctionne', 33),
  ('partenariats_musiqueplus_po', 'MusiquePlus : bon de commande', 'Le PO MusiquePlus.', 'Principal', '🔗', '/agents/partenariats/outils/partenariats_musiqueplus_po', 'fonctionne', 34);

-- Chaque compagnie reçoit une copie de tous les agents (modifiable sans toucher aux autres).
insert into public.agents (compagnie_id, modele_id, cle, nom, role, icone, ordre)
select c.id, m.id, m.cle, m.nom, m.role, m.icone, m.ordre from public.compagnies c cross join public.modeles_agents m;

-- Outils par défaut de chaque agent copié.
insert into public.agents_outils (agent_id, outil_id, ordre)
select a.id, o.id, o.ordre from public.agents a join public.modeles_agents m on m.id = a.modele_id
join public.outils o on o.cle = any (m.outils_defaut);
