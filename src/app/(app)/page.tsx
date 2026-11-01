import { Suspense } from "react";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { AGENTS } from "@/lib/agents";
import { jourEnLettres } from "@/lib/date";
import {
  lireAlertes,
  lireApprobationsEnAttente,
  lireMessagesCerveau,
  lirePriorites,
} from "@/lib/donnees";
import { Priorites } from "./priorites";
import { Alertes } from "./alertes";
import { BoiteCerveau } from "./boite-cerveau";
import { BoutonDeconnexion } from "./deconnexion";

// Accueil : l'écran du Cerveau. Chaque section se charge à son rythme.
export default function Accueil() {
  return (
    <>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">🧠 Le Cerveau</p>
      <Suspense fallback={<h1 className="mt-2 text-3xl font-black">Salut&nbsp;!</h1>}>
        <Salutation />
      </Suspense>

      <Section titre="Mes 3 priorités du jour">
        <Suspense fallback={<Chargement />}>
          <SectionPriorites />
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

      <Section titre="Écrire au Cerveau">
        <Suspense fallback={<Chargement />}>
          <SectionCerveau />
        </Suspense>
      </Section>

      <BoutonDeconnexion />
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

async function SectionPriorites() {
  return <Priorites priorites={await lirePriorites()} />;
}

async function SectionApprobations() {
  const { total, parAgent } = await lireApprobationsEnAttente();

  if (total === 0) {
    return <p className="rounded-2xl bg-carte p-5 text-base text-discret">Rien n&apos;attend ton OK. 🎉</p>;
  }

  return (
    <Link href="/approbations" className="block rounded-2xl bg-carte p-5 active:scale-[0.99]">
      <p className="text-4xl font-black text-orange">{total}</p>
      <p className="text-base font-semibold">
        approbation{total > 1 ? "s" : ""} en attente
      </p>
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

async function SectionCerveau() {
  return <BoiteCerveau messages={await lireMessagesCerveau(10)} />;
}
