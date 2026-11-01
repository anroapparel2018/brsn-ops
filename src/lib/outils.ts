import type { AgentId } from "@/lib/agents";

// Les anciens outils (public/outils/*.html), regroupés par agent.
// « principal » : l'outil de base de l'écran de l'agent.
export type Outil = {
  fichier: string; // sans .html
  nom: string;
  description: string;
  principal?: boolean;
  section?: string;
};

export const OUTILS: Partial<Record<AgentId, Outil[]>> = {
  cerveau: [{ fichier: "cerveau", nom: "Ancien tableau du Cerveau", description: "La version artefact de l'Accueil." }],
  agent_pub: [
    {
      fichier: "agent_pub_studio_pub",
      nom: "Studio Pub",
      description: "Brief, Photos, Textes, Pubs 4:5 et 9:16, Drive, Meta — profils de marque et guides.",
      principal: true,
    },
    { fichier: "agentpub_atelier_des_pubs", nom: "Atelier des pubs", description: "Les 6 pubs et leurs photos.", section: "Campagnes passées" },
    { fichier: "agentpub_promo_packs_visuels", nom: "Promo packs : visuels", description: "Visuels de la promo packs.", section: "Campagnes passées" },
    { fichier: "agentpub_textes_des_pubs", nom: "Textes des pubs", description: "Approuver ou modifier les textes.", section: "Campagnes passées" },
  ],
  studio: [
    { fichier: "studio_hub_du_tournage", nom: "Hub du tournage", description: "La base de chaque tournage.", principal: true },
    { fichier: "studio_salle_de_controle", nom: "Salle de contrôle", description: "Suivi des chansons, takes et liens." },
    { fichier: "studio_anro_live", nom: "ANRO Live", description: "Préparer et suivre les lives." },
    { fichier: "studio_anro_viral_24_videos", nom: "ANRO Viral : 24 vidéos", description: "Le plan des 24 vidéos." },
    { fichier: "studio_idees_videos", nom: "Idées de vidéos", description: "La banque d'idées." },
    { fichier: "studio_genie_du_montage", nom: "Génie du montage", description: "Questions et choix de montage." },
    { fichier: "studio_calendrier_editorial", nom: "Calendrier éditorial", description: "Le calendrier de contenu par marque." },
  ],
  creatif: [
    { fichier: "creatif_photos_web", nom: "Photos web", description: "Choisir et noter les photos du site.", principal: true },
    { fichier: "creatif_brand_hub_logo", nom: "Brand hub et logo", description: "Logo et image de marque." },
    { fichier: "creatif_photos_site_novembre", nom: "Photos du site : novembre", description: "Les photos de novembre." },
    { fichier: "creatif_photos_trailer", nom: "Photos du trailer", description: "Les photos du trailer." },
  ],
  acheteur: [
    { fichier: "acheteur", nom: "L'Acheteur", description: "Usines, specs et conversation avec l'acheteur.", principal: true },
    { fichier: "acheteur_liste_achat", nom: "Liste à acheter", description: "Budget ou qualité, article par article." },
    { fichier: "acheteur_suivi_fournisseurs", nom: "Suivi des fournisseurs", description: "Décisions par fournisseur." },
    { fichier: "acheteur_commande_etape_par_etape", nom: "Commande étape par étape", description: "Le guide d'une commande." },
    { fichier: "acheteur_petite_production", nom: "Petite production", description: "Planifier une petite production." },
    { fichier: "acheteur_commande_csw_attente", nom: "Commande CSW en attente", description: "Canada Sportswear." },
    { fichier: "acheteur_commande_rush_csw", nom: "Commande rush CSW", description: "Canada Sportswear, en rush." },
    { fichier: "acheteur_reception_thickems", nom: "Réception Thickems", description: "Vérifier la réception." },
    { fichier: "acheteur_forecast_inventaire", nom: "Prévision d'inventaire", description: "Approuver le forecast." },
  ],
  tresorier: [
    { fichier: "tresorier_releves_comptable", nom: "Relevés pour le comptable", description: "Préparer les relevés pour RMC.", principal: true },
    { fichier: "tresorier_portrait_financier_rbc", nom: "Portrait financier RBC", description: "Le portrait des comptes RBC." },
  ],
  ecommerce: [
    { fichier: "ecommerce_approbation_modifs_site", nom: "Approbation des modifs du site", description: "Approuver chaque changement.", principal: true },
    { fichier: "ecommerce_seo_standard", nom: "SEO standard", description: "Les règles SEO des fiches produits." },
    { fichier: "ecommerce_trouve_ta_taille", nom: "Trouve ta taille", description: "Outil client du site.", section: "Outils du site" },
    { fichier: "ecommerce_essaie_le_sur_toi", nom: "Essaie-le sur toi", description: "Outil client du site.", section: "Outils du site" },
  ],
  rh: [
    { fichier: "rh_paie_et_punch", nom: "Paie et punch", description: "Le guide de la paie, étape par étape.", principal: true },
    { fichier: "rh_paie_quickbooks", nom: "Paie dans QuickBooks", description: "Le guide QuickBooks." },
    { fichier: "rh_paie_sur_cell", nom: "Paie sur cellulaire", description: "Faire la paie depuis le téléphone." },
  ],
  partenariats: [
    { fichier: "partenariats_musiqueplus_po", nom: "MusiquePlus : bon de commande", description: "Le PO MusiquePlus.", principal: true },
  ],
};

export function trouverOutil(agent: AgentId, fichier: string) {
  return OUTILS[agent]?.find((o) => o.fichier === fichier);
}
