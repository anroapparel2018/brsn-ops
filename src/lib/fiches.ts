import type { AgentId } from "@/lib/agents";

// Fiches (fournisseurs, partenaires, employés, équipement…) affichées dans l'écran de chaque agent.

export type Champ = {
  cle: string;
  nom: string;
  type?: "texte" | "nombre" | "date" | "choix" | "lien";
  options?: string[];
};

export type ConfigFiches = {
  type: string; // colonne « type » de la table fiches
  titre: string;
  vide: string; // quoi faire quand la liste est vide
  sousTitre: string; // libellé du champ sous_titre
  echeance?: string; // libellé du champ échéance (si utile)
  champs: Champ[];
  groupePar?: string; // regroupe les fiches selon ce champ
  imprimable?: boolean; // bouton « Exporter en PDF »
};

export const STATUTS_TOURNAGE = ["À AMENER", "DÉJÀ SUR PLACE", "À CHARGER", "À PRÉPARER", "MANQUANT"];
export const COMPAGNIES = ["ANRO", "Gestion Julien Brisson inc.", "BRSN inc.", "Le Stud.io inc."];

export const FICHES: Partial<Record<AgentId, ConfigFiches[]>> = {
  acheteur: [
    {
      type: "fournisseur",
      titre: "Fiches fournisseurs",
      vide: "Ajoute tes fournisseurs (contact, conditions, produits).",
      sousTitre: "Contact",
      champs: [
        { cle: "produits", nom: "Produits" },
        { cle: "conditions", nom: "Conditions de paiement" },
        { cle: "courriel", nom: "Courriel" },
        { cle: "telephone", nom: "Téléphone" },
      ],
    },
  ],
  partenariats: [
    {
      type: "partenaire",
      titre: "Partenaires et ententes",
      vide: "Ajoute un partenaire avec les termes de l'entente et sa prochaine échéance.",
      sousTitre: "Contact",
      echeance: "Prochaine échéance",
      champs: [
        { cle: "termes", nom: "Termes de l'entente" },
        { cle: "courriel", nom: "Courriel" },
      ],
    },
  ],
  rh: [
    {
      type: "employe",
      titre: "L'équipe",
      vide: "Ajoute chaque membre de l'équipe (rôle, horaire, contrat).",
      sousTitre: "Rôle",
      echeance: "Fin du contrat",
      champs: [
        { cle: "horaire", nom: "Horaire" },
        { cle: "debut_contrat", nom: "Début du contrat", type: "date" },
        { cle: "courriel", nom: "Courriel" },
        { cle: "telephone", nom: "Téléphone" },
      ],
    },
    {
      type: "formation",
      titre: "Registre des formations",
      vide: "Note chaque formation donnée (qui, quoi, quand).",
      sousTitre: "Employé",
      echeance: "Date",
      champs: [],
    },
  ],
  studio: [
    {
      type: "equipement",
      titre: "Équipement vidéo et préparation de tournage",
      vide: "Ajoute ton équipement (caméras, micros, lumières) et son statut pour le prochain tournage.",
      sousTitre: "Catégorie",
      champs: [{ cle: "statut", nom: "Pour le tournage", type: "choix", options: STATUTS_TOURNAGE }],
      groupePar: "statut",
      imprimable: true,
    },
  ],
  tresorier: [
    {
      type: "paiement",
      titre: "Paiements et échéances",
      vide: "Ajoute les paiements à venir (montant, compagnie, date).",
      sousTitre: "Fournisseur ou organisme",
      echeance: "Date du paiement",
      champs: [
        { cle: "compagnie", nom: "Compagnie", type: "choix", options: COMPAGNIES },
        { cle: "montant", nom: "Montant ($)", type: "nombre" },
      ],
      groupePar: "compagnie",
    },
    {
      type: "kilometrage",
      titre: "Registre des kilomètres",
      vide: "Note chaque déplacement d'affaires (date, trajet, km).",
      sousTitre: "Raison du déplacement",
      echeance: "Date",
      champs: [{ cle: "km", nom: "Kilomètres", type: "nombre" }],
    },
  ],
  ecommerce: [
    {
      type: "site",
      titre: "Les sites",
      vide: "Ajoute tes sites (adresse, plateforme).",
      sousTitre: "Plateforme",
      champs: [{ cle: "url", nom: "Adresse", type: "lien" }],
    },
  ],
  creatif: [
    {
      type: "marque",
      titre: "Bibliothèque des guides de marque",
      vide: "Ajoute chaque marque et le lien de son guide.",
      sousTitre: "Couleurs et police",
      champs: [{ cle: "guide", nom: "Lien du guide (PDF, Drive…)", type: "lien" }],
    },
  ],
};
