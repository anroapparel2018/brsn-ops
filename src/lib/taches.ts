import type { AgentId } from "@/lib/agents";

// Tâches et rappels : types et règles partagés (serveur et navigateur).

export const CATEGORIES = [
  { id: "urgent", nom: "Urgent", icone: "🔥" },
  { id: "aujourdhui", nom: "Aujourd'hui", icone: "☀️" },
  { id: "semaine", nom: "Cette semaine", icone: "📅" },
  { id: "plus_tard", nom: "Plus tard", icone: "🗂️" },
  { id: "deleguer", nom: "À déléguer", icone: "🤝" },
] as const;
export type CategorieId = (typeof CATEGORIES)[number]["id"];

export const RECURRENCES = {
  hebdo: "Chaque semaine",
  "2sem": "Aux 2 semaines",
  mensuel: "Chaque mois",
  trimestriel: "Chaque trimestre",
  "1er_lundi": "Le 1er lundi du mois",
} as const;
export type Recurrence = keyof typeof RECURRENCES;

export type Tache = {
  id: string;
  titre: string;
  details: string | null;
  agent: AgentId;
  categorie: CategorieId;
  echeance: string | null; // AAAA-MM-JJ
  rappel_le: string | null; // ISO
  rappel_vu: boolean;
  recurrence: Recurrence | null;
  statut: "a_faire" | "fait";
  fait_le: string | null;
  reporte_au: string | null; // revient ce jour-là
  accepte_le: string | null; // Julien s'en occupe
  clickup_id: string | null;
  cree_le: string;
};

export const COLONNES_TACHE =
  "id, titre, details, agent, categorie, echeance, rappel_le, rappel_vu, recurrence, statut, fait_le, reporte_au, accepte_le, clickup_id, cree_le";

// Prochaine date d'un rappel récurrent.
export function prochaineOccurrence(depuis: Date, recurrence: Recurrence): Date {
  const d = new Date(depuis);
  switch (recurrence) {
    case "hebdo":
      d.setUTCDate(d.getUTCDate() + 7);
      return d;
    case "2sem":
      d.setUTCDate(d.getUTCDate() + 14);
      return d;
    case "mensuel":
      d.setUTCMonth(d.getUTCMonth() + 1);
      return d;
    case "trimestriel":
      d.setUTCMonth(d.getUTCMonth() + 3);
      return d;
    case "1er_lundi": {
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + 1);
      while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
      return d;
    }
  }
}

const RANG: Record<CategorieId, number> = {
  urgent: 0,
  aujourdhui: 1,
  semaine: 2,
  deleguer: 3,
  plus_tard: 4,
};

// La plus importante d'abord : rappel dépassé, puis catégorie, puis date.
export function trierParImportance(taches: Tache[], maintenant = Date.now()) {
  const due = (t: Tache) => !!t.rappel_le && new Date(t.rappel_le).getTime() <= maintenant;
  const quand = (t: Tache) =>
    Math.min(
      t.rappel_le ? new Date(t.rappel_le).getTime() : Infinity,
      t.echeance ? new Date(`${t.echeance}T12:00:00`).getTime() : Infinity,
    );
  return [...taches].sort(
    (a, b) =>
      Number(due(b)) - Number(due(a)) ||
      RANG[a.categorie] - RANG[b.categorie] ||
      quand(a) - quand(b),
  );
}

// Ex. « lun. 2 nov., 9 h 00 »
export function formaterRappel(iso: string) {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "America/Montreal",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formaterDate(jour: string) {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${jour}T00:00:00Z`));
}
