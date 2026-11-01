"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ajouterJours, jourDe, lundiDe, nomJour } from "@/lib/jours";
import { minutesLocales } from "@/lib/agenda-grille";
import { analyserJour } from "@/lib/agenda-analyse";
import type { DemandeEvenement, Evenement } from "@/lib/donnees";
import { FicheEvenement } from "./fiche-evenement";
import { FicheDemande, CarteDemande } from "./fiche-demande";
import { FormulaireDemande } from "./formulaire-demande";
import { Grille, type Element } from "./grille";
import { Mois } from "./mois";
import { synchroniserMaintenant } from "./actions";

type Vue = "jour" | "semaine" | "mois";

const nomMois = (mois: string) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${mois}-15T12:00:00Z`));

function moisVoisin(mois: string, n: number) {
  const d = new Date(`${mois}-15T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

// L'agenda : vues Jour, Semaine et Mois comme Google Agenda, demandes en pointillé, bouton +.
export function VueAgenda({
  evenements,
  demandes,
  aujourdhui,
  maintenant: maintenantInitial,
  peutEcrire,
}: {
  evenements: Evenement[];
  demandes: DemandeEvenement[];
  aujourdhui: string;
  maintenant: string;
  peutEcrire: boolean;
}) {
  const [vue, setVue] = useState<Vue>("jour");
  const [jour, setJour] = useState(aujourdhui);
  const [ouvert, setOuvert] = useState<Element | null>(null);
  const [creation, setCreation] = useState<{ jour: string; minutes: number } | null>(null);
  const [maintenant, setMaintenant] = useState(maintenantInitial);
  const [synchro, demarrer] = useTransition();
  const toucher = useRef<number | null>(null);

  // La ligne « maintenant » avance chaque minute.
  useEffect(() => {
    const t = setInterval(() => setMaintenant(new Date().toISOString()), 60_000);
    return () => clearInterval(t);
  }, []);

  const elements: Element[] = [
    ...evenements.map((e) => ({ type: "evenement" as const, e, debut: e.debut, fin: e.fin })),
    ...demandes.map((d) => ({ type: "demande" as const, d, debut: d.debut, fin: d.fin })),
  ];

  const deplacer = (sens: 1 | -1) => {
    if (vue === "jour") setJour(ajouterJours(jour, sens));
    else if (vue === "semaine") setJour(ajouterJours(jour, 7 * sens));
    else setJour(`${moisVoisin(jour.slice(0, 7), sens)}-01`);
  };
  const ouvrirJour = (j: string) => {
    setJour(j);
    setVue("jour");
  };
  const creerA = (j: string, minutes: number) => setCreation({ jour: j, minutes });

  const lundi = lundiDe(jour);
  const titre =
    vue === "jour" ? nomJour(jour) : vue === "semaine" ? `Semaine du ${nomJour(lundi, false)}` : nomMois(jour.slice(0, 7));
  const { conflits, trous } = analyserJour(evenements, jour);

  return (
    <>
      {demandes.length > 0 && (
        <details className="mt-4 rounded-2xl bg-carte p-4" open={demandes.length <= 2}>
          <summary className="cursor-pointer text-base font-bold">⏳ {demandes.length} demande(s) attendent ton OK</summary>
          <div className="mt-3 flex flex-col gap-3">
            {demandes.map((d) => (
              <CarteDemande key={d.id} d={d} />
            ))}
          </div>
        </details>
      )}

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-carte p-1">
        {(
          [
            ["jour", "Jour"],
            ["semaine", "Semaine"],
            ["mois", "Mois"],
          ] as const
        ).map(([id, nom]) => (
          <button
            key={id}
            onClick={() => setVue(id)}
            className={`h-11 rounded-xl text-base font-bold ${vue === id ? "bg-orange text-white" : ""}`}
          >
            {nom}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button onClick={() => deplacer(-1)} aria-label="Précédent" className="size-11 shrink-0 rounded-xl border-2 border-bordure text-xl font-black">
          ‹
        </button>
        <button onClick={() => setJour(aujourdhui)} className="min-w-0 text-center">
          <p className="truncate text-lg font-black first-letter:uppercase">{titre}</p>
          {jourDe(`${jour}T12:00:00Z`) !== aujourdhui && <p className="text-sm font-semibold text-orange">Aujourd&apos;hui</p>}
        </button>
        <button onClick={() => deplacer(1)} aria-label="Suivant" className="size-11 shrink-0 rounded-xl border-2 border-bordure text-xl font-black">
          ›
        </button>
      </div>

      {/* Glisser à gauche / à droite pour changer de période */}
      <div
        onTouchStart={(e) => (toucher.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (toucher.current === null) return;
          const dx = e.changedTouches[0].clientX - toucher.current;
          toucher.current = null;
          if (Math.abs(dx) > 70) deplacer(dx < 0 ? 1 : -1);
        }}
      >
        {vue === "mois" ? (
          <Mois mois={jour.slice(0, 7)} elements={elements} aujourdhui={aujourdhui} choisirJour={ouvrirJour} ouvrir={setOuvert} />
        ) : (
          <Grille
            jours={vue === "jour" ? [jour] : Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i))}
            elements={elements}
            aujourdhui={aujourdhui}
            maintenant={maintenant}
            ouvrir={setOuvert}
            creerA={creerA}
            choisirJour={ouvrirJour}
          />
        )}
      </div>

      {vue === "jour" && (conflits.length > 0 || trous.length > 0) && (
        <div className="mt-3 flex flex-col gap-2">
          {conflits.map(([a, b]) => (
            <p key={a + b} className="rounded-xl border-l-4 border-l-alerte bg-alerte-fond p-3 text-base">
              ⚠️ « {a} » et « {b} » se chevauchent.
            </p>
          ))}
          {trous.length > 0 && (
            <p className="rounded-xl bg-carte p-3 text-base">
              🕳️ Libre : {trous.map((t) => `${t.de}–${t.a}`).join(", ")}
            </p>
          )}
        </div>
      )}

      {!peutEcrire && (
        <div className="mt-3 rounded-xl bg-carte p-3">
          <p className="text-sm text-discret">
            Pour que l&apos;app puisse créer tes événements approuvés, Google doit accorder une nouvelle permission.
          </p>
          <a href="/api/google/connexion" className="mt-2 flex h-12 items-center justify-center rounded-xl bg-orange text-base font-bold text-white">
            Rebrancher mon agenda
          </a>
        </div>
      )}

      <button
        onClick={() => demarrer(async () => void (await synchroniserMaintenant()))}
        disabled={synchro}
        className="mt-4 h-12 w-full rounded-xl border-2 border-bordure text-base font-bold disabled:opacity-60"
      >
        {synchro ? "Mise à jour…" : "🔄 Mettre à jour depuis Google"}
      </button>

      {/* Bouton + (au-dessus du bouton Note) */}
      <button
        onClick={() => creerA(jour, Math.max(8 * 60, Math.ceil(minutesLocales(maintenant) / 30) * 30))}
        aria-label="Nouvelle demande d'événement"
        className="fixed right-4 bottom-[calc(11rem+env(safe-area-inset-bottom))] z-20 flex size-16 items-center justify-center rounded-full bg-texte text-3xl font-black text-fond shadow-lg active:scale-95"
      >
        +
      </button>

      {creation && <FormulaireDemande jour={creation.jour} minutes={creation.minutes} fermer={() => setCreation(null)} />}
      {ouvert?.type === "evenement" && <FicheEvenement e={ouvert.e} fermer={() => setOuvert(null)} />}
      {ouvert?.type === "demande" && <FicheDemande d={ouvert.d} fermer={() => setOuvert(null)} />}
    </>
  );
}
