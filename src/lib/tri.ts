// Tri partout dans l'app : les mêmes 3 choix, à la même place.
// Accepter = je m'en occupe (reste actif) · Reporter = revient tel jour · Supprimer = archivé, récupérable.

export type Cible = "tache" | "alerte" | "approbation" | "clickup";
export type ActionTri = "accepter" | "reporter" | "supprimer" | "restaurer";
export type Retour = { ok: boolean; message: string; ensuite?: string; annuler?: { cible: Cible; id: string } };

const FUSEAU = "America/Montreal";

export const jourDe = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU }).format(d);

// Ajoute n jours à une date AAAA-MM-JJ.
export function plusJours(jour: string, n: number) {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Choix rapides pour « Reporter » (calculés à partir d'aujourd'hui).
export function choixReport(aujourdhui: string) {
  const jourSemaine = new Date(`${aujourdhui}T12:00:00Z`).getUTCDay(); // 0 = dimanche
  const versLundi = ((8 - jourSemaine) % 7) || 7;
  return [
    { libelle: "Demain", jour: plusJours(aujourdhui, 1) },
    { libelle: "Lundi", jour: plusJours(aujourdhui, versLundi) },
    { libelle: "Dans 1 semaine", jour: plusJours(aujourdhui, 7) },
  ];
}

// « jeudi 5 novembre »
export const jourEnMots = (jour: string) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${jour}T12:00:00Z`),
  );

// Un élément est visible s'il n'est pas archivé et pas reporté à plus tard.
export const visible = (x: { archive_le?: string | null; reporte_au?: string | null }, aujourdhui: string) =>
  !x.archive_le && (!x.reporte_au || x.reporte_au <= aujourdhui);

// Revenu aujourd'hui (ou avant) après un report.
export const revenu = (x: { reporte_au?: string | null }, aujourdhui: string) => !!x.reporte_au && x.reporte_au <= aujourdhui;
