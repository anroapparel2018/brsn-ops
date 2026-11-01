import { jourDe } from "@/lib/jours";

// Placement des événements dans la grille horaire (heure du Québec).
export const HEURE_DEBUT = 6;
export const HEURE_FIN = 23;
export const PX_HEURE = 52;

// Minutes depuis minuit, heure du Québec.
export function minutesLocales(iso: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montreal",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const v = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return v("hour") * 60 + v("minute");
}

export type Bloc<T> = { item: T; haut: number; hauteur: number; colonne: number; colonnes: number };

// Place les éléments d'une journée : position verticale et colonnes quand ils se chevauchent.
export function placer<T extends { debut: string; fin: string }>(items: T[], jour: string): Bloc<T>[] {
  const min = HEURE_DEBUT * 60;
  const max = HEURE_FIN * 60;
  const tries = [...items].sort((a, b) => a.debut.localeCompare(b.debut));
  const blocs: (Bloc<T> & { d: number; f: number })[] = tries.map((item) => {
    const d = jourDe(item.debut) < jour ? min : Math.max(min, minutesLocales(item.debut));
    const f = jourDe(item.fin) > jour ? max : Math.min(max, Math.max(minutesLocales(item.fin), d + 15));
    return {
      item,
      d,
      f,
      haut: ((d - min) / 60) * PX_HEURE,
      hauteur: Math.max(((f - d) / 60) * PX_HEURE, 22),
      colonne: 0,
      colonnes: 1,
    };
  });

  // Grappes d'événements qui se chevauchent : chacun reçoit une colonne.
  let grappe: typeof blocs = [];
  let finGrappe = -1;
  const fermer = () => {
    const fins: number[] = [];
    for (const b of grappe) {
      let c = fins.findIndex((f) => f <= b.d);
      if (c < 0) {
        c = fins.length;
        fins.push(0);
      }
      fins[c] = b.f;
      b.colonne = c;
    }
    for (const b of grappe) b.colonnes = fins.length;
    grappe = [];
  };
  for (const b of blocs) {
    if (grappe.length && b.d >= finGrappe) fermer();
    grappe.push(b);
    finGrappe = Math.max(finGrappe, b.f);
  }
  fermer();
  return blocs;
}
