// Outils de dates à l'heure du Québec (serveur et navigateur).
const FUSEAU = "America/Montreal";

// AAAA-MM-JJ du Québec pour un instant donné.
export const jourDe = (iso: string | number | Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU }).format(new Date(iso));

export const ajouterJours = (jour: string, n: number) => {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// 0 = dimanche … 6 = samedi
export const jourSemaine = (jour: string) => new Date(`${jour}T12:00:00Z`).getUTCDay();

export const lundiDe = (jour: string) => ajouterJours(jour, -((jourSemaine(jour) + 6) % 7));

export const estFinDeSemaine = (jour: string) => [0, 6].includes(jourSemaine(jour));

export const heure = (iso: string) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: FUSEAU, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export const nomJour = (jour: string, long = true) =>
  new Intl.DateTimeFormat("fr-CA", {
    timeZone: "UTC",
    weekday: long ? "long" : "short",
    day: "numeric",
    month: long ? "long" : "short",
  }).format(new Date(`${jour}T12:00:00Z`));
