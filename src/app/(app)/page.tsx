import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { AGENTS, trouverAgent } from "@/lib/agents";
import { aujourdhui, jourEnLettres } from "@/lib/date";
import {
  lireAlertes,
  lireApprobationsEnAttente,
  lireArrivesDeClaude,
  lirePriorites,
  lireTachesAFaire,
  lireVentesAnnee,
} from "@/lib/donnees";
import { DATES_IMPORTANTES, joursAvant, OBJECTIF_VENTES, PROMOS } from "@/lib/promos";
import { formaterDate, formaterRappel } from "@/lib/taches";
import { Priorites } from "./priorites";
import { Alertes } from "./alertes";
import { Objectif } from "./objectif";
import { AgendaDuJour } from "./agenda-du-jour";

// Accueil : le brief du jour. Chaque section se charge à son rythme.
export default function Accueil() {
  return (
    <>
      <Suspense fallback={<h1 className="mt-2 text-3xl font-black">Salut&nbsp;!</h1>}>
        <Salutation />
      </Suspense>

      <Section titre="Ton agenda aujourd'hui">
        <Suspense fallback={<Chargement />}>
          <AgendaDuJour />
        </Suspense>
      </Section>

      <Suspense fallback={null}>
        <SectionClaude />
      </Suspense>

      <Section titre="Mes 3 priorités du jour">
        <Suspense fallback={<Chargement />}>
          <SectionPriorites />
        </Suspense>
      </Section>

      <Section titre="Aujourd'hui">
        <Suspense fallback={<Chargement />}>
          <SectionAujourdhui />
        </Suspense>
      </Section>

      <Section titre="Ce qui attend ton OK">
        <Suspense fallback={<Chargement />}>
          <SectionApprobations />
        </Suspense>
      </Section>

      <Section titre="Alertes">
        <Suspense fallback={<Chargement />}>
          <SectionAlertes />
        </Suspense>
      </Section>

      <Section titre="Compte à rebours">
        <Suspense fallback={<Chargement />}>
          <SectionDates />
        </Suspense>
      </Section>

      <Section titre="Objectif 3 M$">
        <Suspense fallback={<Chargement />}>
          <SectionObjectif />
        </Suspense>
      </Section>
    </>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-black">{titre}</h2>
      {children}
    </section>
  );
}

function Chargement() {
  return <div className="h-20 animate-pulse rounded-2xl bg-carte" />;
}

async function Salutation() {
  const user = await getUser();
  const prenom = user?.email?.startsWith("julien") ? "Julien" : "";
  return (
    <>
      <h1 className="mt-2 text-3xl font-black">Salut {prenom}&nbsp;!</h1>
      <p className="mt-1 text-base text-discret first-letter:uppercase">{jourEnLettres()}</p>
    </>
  );
}

const TYPES_CLAUDE = {
  tache: { icone: "✅", nom: "Tâche", lien: "/a-faire" },
  rappel: { icone: "⏰", nom: "Rappel", lien: "/a-faire" },
  approbation: { icone: "📥", nom: "Approbation", lien: "/approbations" },
  note: { icone: "📝", nom: "Note", lien: "/recherche" },
  decision: { icone: "⚖️", nom: "Décision", lien: "/recherche" },
} as const;

// Ce que Claude a créé ici dans les 7 derniers jours (rien si le pont n'a pas servi).
async function SectionClaude() {
  const cartes = await lireArrivesDeClaude();
  if (!cartes.length) return null;
  return (
    <Section titre="Arrivé de Claude">
      <ul className="flex flex-col gap-2">
        {cartes.map((c) => {
          const t = TYPES_CLAUDE[c.type];
          return (
            <li key={c.id}>
              <Link href={t.lien} className="flex items-start gap-3 rounded-2xl bg-carte p-4 active:scale-[0.99]">
                <span className="text-2xl leading-none">{t.icone}</span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-bold">{c.titre}</span>
                  <span className="block text-sm text-discret">
                    {t.nom}
                    {c.agent ? ` · ${trouverAgent(c.agent)?.court ?? c.agent}` : ""} · {formaterQuand(c.cree_le)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function formaterQuand(iso: string) {
  return new Date(iso).toLocaleString("fr-CA", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Toronto",
  });
}

async function SectionPriorites() {
  return <Priorites priorites={await lirePriorites()} />;
}

// Rappels du jour et prochaines échéances (14 jours).
async function SectionAujourdhui() {
  const taches = await lireTachesAFaire();
  const jour = aujourdhui();
  const finJour = new Date(`${jour}T23:59:59-05:00`).getTime();
  const rappels = taches
    .filter((t) => t.rappel_le && new Date(t.rappel_le).getTime() <= finJour)
    .sort((a, b) => a.rappel_le!.localeCompare(b.rappel_le!));
  const echeances = taches
    .filter((t) => t.echeance && joursAvant(jour, t.echeance) >= 0 && joursAvant(jour, t.echeance) <= 14)
    .sort((a, b) => a.echeance!.localeCompare(b.echeance!));
  const urgentes = taches.filter((t) => t.categorie === "urgent").length;

  return (
    <div className="flex flex-col gap-3">
      <Link href="/a-faire" className="flex items-center justify-between rounded-2xl bg-carte p-5 active:scale-[0.99]">
        <span>
          <span className="block text-4xl font-black text-orange">{taches.length}</span>
          <span className="text-base font-semibold">
            tâches à faire{urgentes ? ` · ${urgentes} urgentes` : ""}
          </span>
        </span>
        <span className="text-base font-bold text-orange">Voir →</span>
      </Link>

      <div className="rounded-2xl bg-carte p-5">
        <p className="text-base font-bold">⏰ Rappels d&apos;aujourd&apos;hui</p>
        {rappels.length ? (
          <ul className="mt-2 flex flex-col gap-2">
            {rappels.slice(0, 8).map((t) => (
              <li key={t.id} className="text-base">
                <span className="font-semibold">{formaterRappel(t.rappel_le!).split(",").pop()}</span> · {t.titre}{" "}
                <span className="text-discret">({trouverAgent(t.agent)?.court})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-base text-discret">Aucun rappel aujourd&apos;hui.</p>
        )}
      </div>

      <div className="rounded-2xl bg-carte p-5">
        <p className="text-base font-bold">📌 Prochaines échéances</p>
        {echeances.length ? (
          <ul className="mt-2 flex flex-col gap-2">
            {echeances.map((t) => (
              <li key={t.id} className="text-base">
                <span className="font-semibold">{formaterDate(t.echeance!)}</span> · {t.titre}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-base text-discret">Rien dans les 14 prochains jours.</p>
        )}
      </div>
    </div>
  );
}

async function SectionApprobations() {
  const { total, parAgent } = await lireApprobationsEnAttente();

  if (total === 0) {
    return <p className="rounded-2xl bg-carte p-5 text-base text-discret">Rien n&apos;attend ton OK. 🎉</p>;
  }

  return (
    <Link href="/approbations" className="block rounded-2xl bg-carte p-5 active:scale-[0.99]">
      <p className="text-4xl font-black text-orange">{total}</p>
      <p className="text-base font-semibold">approbation{total > 1 ? "s" : ""} en attente</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {AGENTS.filter((a) => parAgent[a.id]).map((a) => (
          <li key={a.id} className="rounded-full border-2 border-bordure px-3 py-1 text-sm font-semibold">
            {a.icone} {a.court} · {parAgent[a.id]}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-base font-bold text-orange">Voir et décider →</p>
    </Link>
  );
}

async function SectionAlertes() {
  const [alertes, { anciennes }] = await Promise.all([lireAlertes(), lireApprobationsEnAttente()]);
  return <Alertes alertes={alertes} anciennes={anciennes} />;
}

// Compte à rebours des dates importantes + promo en cours.
async function SectionDates() {
  await connection(); // la date du jour se lit au moment de la requête
  const jour = aujourdhui();
  const promo = PROMOS.find((p) => p.debut <= jour && jour <= p.fin);
  const prochaines = DATES_IMPORTANTES.filter((d) => joursAvant(jour, d.date) >= 0).slice(0, 6);

  return (
    <div className="flex flex-col gap-3">
      {promo && (
        <div className="rounded-2xl border-2 border-orange p-4">
          <p className="text-sm font-semibold text-orange">Promo en cours</p>
          <p className="text-lg font-bold">
            {promo.nom} · jusqu&apos;au {formaterDate(promo.fin)} ({joursAvant(jour, promo.fin)} j)
          </p>
        </div>
      )}
      <ul className="grid grid-cols-2 gap-2">
        {prochaines.map((d) => {
          const n = joursAvant(jour, d.date);
          return (
            <li key={d.date + d.nom} className="rounded-2xl bg-carte p-4">
              <p className="text-3xl font-black text-orange">{n === 0 ? "Auj." : `${n} j`}</p>
              <p className="mt-1 text-sm font-semibold">{d.nom}</p>
              <p className="text-sm text-discret">{formaterDate(d.date)}</p>
            </li>
          );
        })}
      </ul>
      <details className="rounded-2xl bg-carte p-4">
        <summary className="cursor-pointer text-base font-bold">📣 Calendrier des promos</summary>
        <ul className="mt-2 flex flex-col gap-1 text-base">
          {PROMOS.map((p) => (
            <li key={p.nom}>
              <strong>{p.nom}</strong> : {formaterDate(p.debut)} au {formaterDate(p.fin)}
            </li>
          ))}
          <li className="text-discret">L&apos;agence termine fin novembre ; l&apos;Agent Pub prend le relais le 1er décembre.</li>
        </ul>
      </details>
    </div>
  );
}

async function SectionObjectif() {
  const ventes = await lireVentesAnnee();
  return <Objectif ventes={ventes?.montant ?? null} objectif={OBJECTIF_VENTES} />;
}
