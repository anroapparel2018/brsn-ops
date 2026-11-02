import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { trouverAgent } from "@/lib/agents";
import { aujourdhui, jourEnLettres } from "@/lib/date";
import { lireAccueil } from "@/lib/accueil";
import { lireAlertes, lireApprobations, lireArrivesDeClaude, lireVentesAnnee } from "@/lib/donnees";
import { DATES_IMPORTANTES, joursAvant, OBJECTIF_VENTES, PROMOS } from "@/lib/promos";
import { formaterDate, type Tache } from "@/lib/taches";
import { jourDe } from "@/lib/tri";
import { Objectif } from "./objectif";
import { AgendaDuJour } from "./agenda-du-jour";
import { BoutonsTri } from "./boutons-tri";
import { CartePriorite, TONS, fondTeinte } from "./_accueil/cartes";
import { AlertesAccueil } from "./_accueil/alertes-accueil";
import { AttendOk } from "./_accueil/attend-ok";
import type { Approbation } from "./approbations/bloc-approbation";

// Accueil : le bras droit de Julien. Rien ne se perd, tout se trie (Accepter, Reporter, Supprimer).
export default function Accueil() {
  return (
    <>
      <Suspense fallback={<h1 className="mt-2 text-3xl font-black">Salut&nbsp;!</h1>}>
        <Salutation />
      </Suspense>

      <Section titre="Ton agenda aujourd'hui" icone="📅">
        <Suspense fallback={<Chargement />}>
          <AgendaDuJour />
        </Suspense>
      </Section>

      <Suspense fallback={null}>
        <SectionReportes />
      </Suspense>

      <Section titre="Mes 3 priorités du jour" icone="🎯" couleur={TONS.argent.couleur}>
        <Suspense fallback={<Chargement />}>
          <SectionPriorites />
        </Suspense>
      </Section>

      <Section titre="Tâches urgentes" icone="🔥" couleur={TONS.urgent.couleur}>
        <Suspense fallback={<Chargement />}>
          <SectionUrgentes />
        </Suspense>
      </Section>

      <Section titre="Ce qui attend ton OK" icone="📥" couleur={TONS.argent.couleur} ancre="ok">
        <Suspense fallback={<Chargement />}>
          <SectionOk />
        </Suspense>
      </Section>

      <Section titre="Alertes" icone="🚨" couleur={TONS.urgent.couleur} ancre="alertes">
        <Suspense fallback={<Chargement />}>
          <SectionAlertes />
        </Suspense>
      </Section>

      <Suspense fallback={null}>
        <SectionClaude />
      </Suspense>

      <Section titre="Compte à rebours" icone="⏳">
        <Suspense fallback={<Chargement />}>
          <SectionDates />
        </Suspense>
      </Section>

      <Section titre="Objectif 3 M$" icone="📈">
        <Suspense fallback={<Chargement />}>
          <SectionObjectif />
        </Suspense>
      </Section>

      <p className="mt-10 text-center">
        <Link href="/historique" className="text-base font-bold text-orange">
          🗂️ Historique : ce que tu as accepté, reporté ou supprimé →
        </Link>
      </p>
    </>
  );
}

function Section({
  titre,
  icone,
  couleur,
  ancre,
  children,
}: {
  titre: string;
  icone: string;
  couleur?: string;
  ancre?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={ancre} className="mt-9 scroll-mt-20">
      <h2 className="mb-3 flex items-center gap-2 text-xl font-black">
        <span
          className="flex size-8 items-center justify-center rounded-lg text-lg"
          style={{ background: couleur ? `color-mix(in srgb, ${couleur} 22%, transparent)` : "var(--carte)" }}
        >
          {icone}
        </span>
        {titre}
      </h2>
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

// Ce qui revient aujourd'hui après un report : tout en haut, marqué « Reporté ».
async function SectionReportes() {
  const { reportes } = await lireAccueil();
  if (!reportes.length) return null;
  return (
    <Section titre="Revenu aujourd'hui" icone="⏰" couleur="#141414">
      <ul className="flex flex-col gap-3">
        {reportes.map((c) => (
          <CartePriorite key={c.cle} c={c} />
        ))}
      </ul>
    </Section>
  );
}

// Les 3 vraies priorités, calculées à partir de tout ce qui est ouvert.
async function SectionPriorites() {
  const { priorites, suivantes } = await lireAccueil();
  if (!priorites.length) {
    return <p className="rounded-2xl bg-carte p-5 text-base text-discret">Rien d&apos;ouvert. Profites-en. 🎉</p>;
  }
  return (
    <>
      <ol className="flex flex-col gap-3">
        {priorites.map((c, i) => (
          <CartePriorite key={c.cle} c={c} rang={i + 1} />
        ))}
      </ol>
      {suivantes > 0 && (
        <p className="mt-2 text-sm text-discret">
          Quand tu en tries une, la suivante prend sa place.
        </p>
      )}
    </>
  );
}

// Seulement les vraies urgences (marquées urgentes ou échéance arrivée), triées par date.
async function SectionUrgentes() {
  const { urgentes, jour } = await lireAccueil();
  if (!urgentes.length) {
    return <p className="rounded-2xl bg-carte p-5 text-base text-discret">Aucune tâche urgente. 👍</p>;
  }
  return (
    <>
      <p className="mb-3 text-base font-semibold">
        <span className="text-2xl font-black" style={{ color: TONS.urgent.couleur }}>
          {urgentes.length}
        </span>{" "}
        tâche{urgentes.length > 1 ? "s" : ""} urgente{urgentes.length > 1 ? "s" : ""}
      </p>
      <ul className="flex flex-col gap-3">
        {urgentes.map((t) => (
          <LigneUrgente key={t.id} t={t} jour={jour} />
        ))}
      </ul>
      <Link href="/a-faire" className="mt-3 block text-base font-bold text-orange">
        Toutes mes tâches →
      </Link>
    </>
  );
}

function quandTache(t: Tache, jour: string) {
  if (t.echeance) {
    const n = joursAvant(jour, t.echeance);
    if (n < 0) return `En retard de ${-n} j`;
    if (n === 0) return "Aujourd'hui";
    return `Pour le ${formaterDate(t.echeance)}`;
  }
  // Le rappel n'est mentionné que s'il tombe aujourd'hui.
  if (t.rappel_le && jourDe(new Date(t.rappel_le)) === jour) {
    const heure = new Intl.DateTimeFormat("fr-CA", { timeZone: "America/Montreal", hour: "numeric", minute: "2-digit" }).format(
      new Date(t.rappel_le),
    );
    return `Rappel à ${heure}`;
  }
  return "Sans date";
}

function LigneUrgente({ t, jour }: { t: Tache; jour: string }) {
  const agent = trouverAgent(t.agent);
  return (
    <li className="rounded-2xl border-l-[6px] p-4" style={fondTeinte(TONS.urgent.couleur, 10)}>
      <p className="flex items-center gap-2 text-xs font-black tracking-wide uppercase">
        <span style={{ color: TONS.urgent.couleur }}>{quandTache(t, jour)}</span>
        <span className="ml-auto truncate font-semibold tracking-normal text-discret normal-case">
          {agent?.icone} {agent?.court}
        </span>
      </p>
      <p className="mt-1 text-lg leading-snug font-black">{t.titre}</p>
      <BoutonsTri cible="tache" id={t.id} titre={t.titre} />
    </li>
  );
}

async function SectionOk() {
  const { enAttente } = await lireApprobations();
  // Les demandes revenues d'un report sont en haut de la page (« Revenu aujourd'hui ») jusqu'à ce que tu les acceptes.
  const liste = enAttente as (Approbation & { reporte_au: string | null })[];
  return <AttendOk enAttente={liste.filter((a) => !a.reporte_au)} />;
}

async function SectionAlertes() {
  return <AlertesAccueil alertes={(await lireAlertes()).filter((a) => !a.reporte_au)} />;
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
    <Section titre="Arrivé de Claude" icone="✨">
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

// Compte à rebours des dates importantes + promo en cours.
async function SectionDates() {
  await connection(); // la date du jour se lit au moment de la requête
  const jour = aujourdhui();
  const promo = PROMOS.find((p) => p.debut <= jour && jour <= p.fin);
  const prochaines = DATES_IMPORTANTES.filter((d) => joursAvant(jour, d.date) >= 0).slice(0, 6);

  return (
    <div className="flex flex-col gap-3">
      {promo && (
        <div className="rounded-2xl border-l-[6px] p-4" style={fondTeinte(TONS.argent.couleur)}>
          <p className="text-xs font-black tracking-wide uppercase" style={{ color: TONS.argent.couleur }}>
            Promo en cours
          </p>
          <p className="mt-1 text-lg font-black">
            {promo.nom} · jusqu&apos;au {formaterDate(promo.fin)} ({joursAvant(jour, promo.fin)} j)
          </p>
        </div>
      )}
      <ul className="grid grid-cols-2 gap-3">
        {prochaines.map((d) => {
          const n = joursAvant(jour, d.date);
          return (
            <li key={d.date + d.nom} className="rounded-2xl bg-carte p-4">
              <p className="text-3xl font-black" style={{ color: TONS.argent.couleur }}>
                {n === 0 ? "Auj." : `${n} j`}
              </p>
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
