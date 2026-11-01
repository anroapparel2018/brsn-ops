// Code de couleurs de l'agenda de Julien (partagé serveur et navigateur).

export const CATEGORIES_AGENDA = [
  { id: "urgent", nom: "Urgent", couleur: "#d9534f" },
  { id: "production", nom: "Tournages, production, stock", couleur: "#e8833a" },
  { id: "rdv", nom: "Rendez-vous et rencontres", couleur: "#e27aa8" },
  { id: "contenu", nom: "Contenu et marketing", couleur: "#4caf6e" },
  { id: "admin", nom: "Administratif", couleur: "#4a8fd9" },
  { id: "systemes", nom: "Systèmes et implantation", couleur: "#9466d6" },
  { id: "personnel", nom: "Personnel", couleur: "#e3c23d" },
  { id: "autre", nom: "Non classé", couleur: "#8a857e" },
] as const;
export type CategorieAgenda = (typeof CATEGORIES_AGENDA)[number]["id"];

// Mots du titre (sans accents, minuscules) → catégorie. Le premier groupe qui correspond gagne.
const REGLES: [CategorieAgenda, string[]][] = [
  ["urgent", ["urgent", "urgence", "asap", "deadline", "critique"]],
  ["production", ["tournage", "shooting", "shoot", "production", "prod ", "stock", "inventaire", "reception", "livraison", "usine", "echantillon", "live", "montage", "photo", "video"]],
  ["admin", ["contrat", "paie", "payroll", "finance", "comptab", "rmc", "facture", "banque", "rbc", "impot", "taxe", "tps", "tvq", "courriel", "email", "assurance", "req ", "budget", "paiement"]],
  ["systemes", ["systeme", "implantation", "brsn ops", "app ", "slack", "clickup", "shopify", "quickbooks", "automatisation", "formation", "documentation", "setup", "config"]],
  ["contenu", ["contenu", "marketing", "pub", "campagne", "meta", "tiktok", "instagram", "post", "reel", "promo", "newsletter", "influence", "black friday", "calendrier editorial"]],
  ["personnel", ["perso", "famille", "medecin", "dentiste", "gym", "sport", "anniversaire", "souper", "diner", "vacances", "conge", "enfant"]],
  ["rdv", ["rencontre", "rendez-vous", "rdv", "meeting", "reunion", "call", "appel", "lunch", "cafe", "entrevue", "board", "point "]],
];

export function categoriser(titre: string, aDesInvites = false): CategorieAgenda {
  const t = ` ${titre} `.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  for (const [cat, mots] of REGLES) if (mots.some((m) => t.includes(m))) return cat;
  return aDesInvites ? "rdv" : "autre";
}

export function infoCategorie(id: string | null | undefined) {
  return CATEGORIES_AGENDA.find((c) => c.id === id) ?? CATEGORIES_AGENDA[CATEGORIES_AGENDA.length - 1];
}
