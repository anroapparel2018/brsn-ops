import { Suspense } from "react";
import { lireAgenda } from "@/lib/donnees";
import { aujourdhui } from "@/lib/date";
import { googlePret } from "@/lib/agenda";
import { VueAgenda } from "./vue-agenda";

const ERREURS: Record<string, string> = {
  configuration: "La connexion Google n'est pas encore configurée (identifiants manquants dans Vercel).",
  refus: "La connexion a été annulée dans Google.",
  securite: "La connexion a expiré. Réessaie.",
  jeton: "Google n'a pas donné l'accès permanent. Réessaie.",
  permission: "Il faut accepter la lecture de l'agenda pour continuer.",
  google: "Google a refusé la connexion. Réessaie dans un moment.",
  enregistrement: "La connexion n'a pas pu être enregistrée. Réessaie.",
};

export default function Agenda({ searchParams }: PageProps<"/agenda">) {
  return (
    <>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">📅 Agenda</p>
      <h1 className="mt-2 text-3xl font-black">Mon agenda</h1>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-carte" />}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Contenu({ searchParams }: { searchParams: PageProps<"/agenda">["searchParams"] }) {
  const p = await searchParams;
  const jour = aujourdhui();
  const debut = new Date(`${jour}T00:00:00-05:00`);
  debut.setUTCDate(debut.getUTCDate() - 8);
  const fin = new Date(debut.getTime() + 40 * 86_400_000);
  const { connecte, evenements } = await lireAgenda(debut.toISOString(), fin.toISOString());
  const erreur = typeof p.erreur === "string" ? ERREURS[p.erreur] : null;

  if (!connecte) {
    return (
      <div className="mt-6 flex flex-col gap-4">
        {erreur && <p className="rounded-2xl border-l-4 border-l-alerte bg-alerte-fond p-4 text-base">{erreur}</p>}
        <div className="rounded-2xl bg-carte p-6">
          <p className="text-lg font-bold">Branche ton Google Agenda</p>
          <p className="mt-2 text-base text-discret">
            L&apos;app lit tes événements (lecture seule : elle ne crée, ne modifie et ne supprime jamais rien), les
            affiche avec ton code de couleurs, et le Cerveau s&apos;en sert pour tes briefings.
          </p>
          {googlePret() ? (
             
            <a
              href="/api/google/connexion"
              className="mt-5 flex h-14 items-center justify-center rounded-xl bg-orange text-lg font-bold text-white active:scale-[0.98]"
            >
              Connecter mon agenda Google
            </a>
          ) : (
            <p className="mt-5 rounded-xl border-2 border-dashed border-bordure p-4 text-base text-discret">
              🔌 À brancher : les identifiants Google ne sont pas encore dans Vercel.
            </p>
          )}
          <p className="mt-3 text-sm text-discret">
            Google peut afficher « application non vérifiée » : c&apos;est normal pour une app interne. Touche
            « Paramètres avancés », puis « Continuer ».
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {p.connecte && <p className="mt-4 rounded-xl bg-carte p-3 text-base">✅ Ton agenda est branché.</p>}
      <VueAgenda evenements={evenements} aujourdhui={jour} />
    </>
  );
}
