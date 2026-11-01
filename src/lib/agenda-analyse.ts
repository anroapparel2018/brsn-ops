import { estFinDeSemaine, heure, jourDe } from "@/lib/jours";

// Trous et conflits d'une journée de travail (lundi au vendredi, 9 h à 17 h, heure du Québec).

type Ev = { titre: string; debut: string; fin: string; journee_entiere: boolean };

// Instant ISO d'une heure locale du Québec (gère l'heure d'été / d'hiver).
export function instantLocal(jour: string, h: number) {
  for (const decalage of ["-05:00", "-04:00"]) {
    const iso = `${jour}T${String(h).padStart(2, "0")}:00:00${decalage}`;
    const hLocale = Number(
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montreal", hour: "numeric", hourCycle: "h23" }).format(new Date(iso)),
    );
    if (hLocale === h) return new Date(iso).getTime();
  }
  return new Date(`${jour}T${String(h).padStart(2, "0")}:00:00-05:00`).getTime();
}

export function analyserJour(evenements: Ev[], jour: string) {
  const duJour = evenements
    .filter((e) => !e.journee_entiere && jourDe(e.debut) === jour)
    .sort((a, b) => a.debut.localeCompare(b.debut));

  const conflits: [string, string][] = [];
  for (let i = 0; i < duJour.length; i++) {
    for (let j = i + 1; j < duJour.length; j++) {
      if (new Date(duJour[j].debut) < new Date(duJour[i].fin)) conflits.push([duJour[i].titre, duJour[j].titre]);
    }
  }

  const trous: { de: string; a: string; minutes: number }[] = [];
  if (!estFinDeSemaine(jour)) {
    let curseur = instantLocal(jour, 9);
    const finJournee = instantLocal(jour, 17);
    for (const e of duJour) {
      const d = new Date(e.debut).getTime();
      const f = new Date(e.fin).getTime();
      if (f <= curseur) continue;
      if (d - curseur >= 30 * 60_000 && d <= finJournee) {
        trous.push({ de: heure(new Date(curseur).toISOString()), a: heure(e.debut), minutes: Math.round((d - curseur) / 60_000) });
      }
      curseur = Math.max(curseur, f);
    }
    if (finJournee - curseur >= 30 * 60_000) {
      trous.push({
        de: heure(new Date(curseur).toISOString()),
        a: heure(new Date(finJournee).toISOString()),
        minutes: Math.round((finJournee - curseur) / 60_000),
      });
    }
  }
  return { conflits, trous };
}
