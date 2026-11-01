import Link from "next/link";
import { connection } from "next/server";
import { aujourdhui } from "@/lib/date";
import { lireAgenda } from "@/lib/donnees";
import { infoCategorie } from "@/lib/categories-agenda";
import { heure, jourDe } from "@/lib/jours";
import { analyserJour } from "@/lib/agenda-analyse";

// Accueil : « Aujourd'hui tu as… » (événements Google du jour, conflits et plages libres).
export async function AgendaDuJour() {
  await connection(); // la date du jour se lit au moment de la requête
  const jour = aujourdhui();
  const debut = new Date(`${jour}T00:00:00-05:00`);
  const fin = new Date(debut.getTime() + 2 * 86_400_000);
  const { connecte, evenements } = await lireAgenda(debut.toISOString(), fin.toISOString());

  if (!connecte) {
    return (
      <Link href="/agenda" className="block rounded-2xl bg-carte p-5 text-base">
        📅 Branche ton Google Agenda pour voir ta journée ici. <span className="font-bold text-orange">Brancher →</span>
      </Link>
    );
  }

  const duJour = evenements.filter((e) =>
    e.journee_entiere ? jourDe(e.debut) <= jour && jour < jourDe(e.fin) : jourDe(e.debut) === jour,
  );
  const { conflits, trous } = analyserJour(evenements, jour);

  return (
    <Link href="/agenda" className="block rounded-2xl bg-carte p-5 active:scale-[0.99]">
      <p className="text-base font-bold">
        {duJour.length ? `Aujourd'hui tu as ${duJour.length} événement${duJour.length > 1 ? "s" : ""} :` : "Rien à l'agenda aujourd'hui. 🌤️"}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {duJour.map((e) => (
          <li key={e.google_id} className="flex items-center gap-2 text-base">
            <span className="size-3 shrink-0 rounded-full" style={{ background: infoCategorie(e.categorie ?? e.categorie_auto).couleur }} />
            <span className="font-semibold">{e.journee_entiere ? "Journée" : heure(e.debut)}</span>
            <span className="min-w-0 truncate">{e.titre}</span>
            {e.meet && <span>🎥</span>}
          </li>
        ))}
      </ul>
      {conflits.length > 0 && <p className="mt-3 text-sm font-semibold text-alerte">⚠️ {conflits.length} conflit(s) d&apos;horaire</p>}
      {trous.length > 0 && (
        <p className="mt-2 text-sm text-discret">Libre : {trous.map((t) => `${t.de}–${t.a}`).join(", ")}</p>
      )}
      <p className="mt-3 text-base font-bold text-orange">Voir l&apos;agenda →</p>
    </Link>
  );
}
