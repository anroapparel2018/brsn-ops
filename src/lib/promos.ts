// Calendrier des promos et dates importantes (automne-hiver 2026). À tenir à jour ici.

export const PROMOS = [
  { nom: "Promo packs", debut: "2026-10-01", fin: "2026-11-19" },
  { nom: "Black Friday", debut: "2026-11-20", fin: "2026-11-30" },
  { nom: "Noël", debut: "2026-12-01", fin: "2026-12-23" },
  { nom: "Vente de fin d'année", debut: "2026-12-24", fin: "2026-12-31" },
];

export const DATES_IMPORTANTES = [
  { date: "2026-11-19", nom: "Fin des promo packs" },
  { date: "2026-11-20", nom: "Black Friday commence" },
  { date: "2026-11-20", nom: "Salon de la femme (20 au 22 nov.)" },
  { date: "2026-11-23", nom: "Hoodies : 8 983,94 $ à payer" },
  { date: "2026-11-30", nom: "Fin de l'agence de pub" },
  { date: "2026-12-01", nom: "L'Agent Pub prend le relais · Ranchero facturé par BRSN inc." },
  { date: "2026-12-01", nom: "Promo de Noël commence" },
  { date: "2026-12-24", nom: "Vente de fin d'année" },
];

export const OBJECTIF_VENTES = 3_000_000;

// Nombre de jours entre aujourd'hui (AAAA-MM-JJ) et une date.
export function joursAvant(aujourdhui: string, date: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${aujourdhui}T00:00:00Z`)) / 86_400_000);
}
