"use client";

import { useState, useTransition } from "react";
import { infoCategorie } from "@/lib/categories-agenda";
import { ajouterJours, estFinDeSemaine, heure, jourDe, lundiDe, nomJour } from "@/lib/jours";
import { analyserJour } from "@/lib/agenda-analyse";
import type { Evenement } from "@/lib/donnees";
import { FicheEvenement } from "./fiche-evenement";
import { synchroniserMaintenant } from "./actions";

const duJour = (evs: Evenement[], jour: string) =>
  evs.filter((e) =>
    e.journee_entiere ? jourDe(e.debut) <= jour && jour < jourDe(e.fin) : jourDe(e.debut) === jour,
  );

export function VueAgenda({ evenements, aujourdhui }: { evenements: Evenement[]; aujourdhui: string }) {
  const [vue, setVue] = useState<"jour" | "semaine">("jour");
  const [jour, setJour] = useState(aujourdhui);
  const [ouvert, setOuvert] = useState<Evenement | null>(null);
  const [synchro, demarrer] = useTransition();
  const lundi = lundiDe(jour);

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-carte p-1">
        {(
          [
            ["jour", "Jour"],
            ["semaine", "Semaine"],
          ] as const
        ).map(([id, nom]) => (
          <button
            key={id}
            onClick={() => setVue(id)}
            className={`h-12 rounded-xl text-base font-bold ${vue === id ? "bg-orange text-white" : ""}`}
          >
            {nom}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={() => setJour(ajouterJours(jour, vue === "jour" ? -1 : -7))}
          aria-label="Précédent"
          className="size-12 shrink-0 rounded-xl border-2 border-bordure text-xl font-black"
        >
          ‹
        </button>
        <button onClick={() => setJour(aujourdhui)} className="min-w-0 text-center">
          <p className="truncate text-lg font-black first-letter:uppercase">
            {vue === "jour" ? nomJour(jour) : `Semaine du ${nomJour(lundi, false)}`}
          </p>
          {jour !== aujourdhui && <p className="text-sm font-semibold text-orange">Revenir à aujourd&apos;hui</p>}
        </button>
        <button
          onClick={() => setJour(ajouterJours(jour, vue === "jour" ? 1 : 7))}
          aria-label="Suivant"
          className="size-12 shrink-0 rounded-xl border-2 border-bordure text-xl font-black"
        >
          ›
        </button>
      </div>

      {vue === "jour" ? (
        <Jour evenements={duJour(evenements, jour)} tous={evenements} jour={jour} ouvrir={setOuvert} />
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i)).map((j) => {
            const evs = duJour(evenements, j);
            return (
              <section key={j} className={estFinDeSemaine(j) ? "opacity-60" : ""}>
                <button onClick={() => { setJour(j); setVue("jour"); }} className="mb-2 flex w-full items-baseline justify-between">
                  <h2 className={`text-base font-black first-letter:uppercase ${j === aujourdhui ? "text-orange" : ""}`}>
                    {nomJour(j)}
                  </h2>
                  <span className="text-sm text-discret">{evs.length ? `${evs.length} év.` : "libre"}</span>
                </button>
                <ul className="flex flex-col gap-2">
                  {evs.map((e) => (
                    <Ligne key={e.google_id} e={e} ouvrir={setOuvert} compact />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <button
        onClick={() => demarrer(async () => void (await synchroniserMaintenant()))}
        disabled={synchro}
        className="mt-8 h-12 w-full rounded-xl border-2 border-bordure text-base font-bold disabled:opacity-60"
      >
        {synchro ? "Mise à jour…" : "🔄 Mettre à jour depuis Google"}
      </button>

      {ouvert && <FicheEvenement e={ouvert} fermer={() => setOuvert(null)} />}
    </>
  );
}

function Jour({
  evenements,
  tous,
  jour,
  ouvrir,
}: {
  evenements: Evenement[];
  tous: Evenement[];
  jour: string;
  ouvrir: (e: Evenement) => void;
}) {
  const { conflits, trous } = analyserJour(tous, jour);
  return (
    <div className="mt-4 flex flex-col gap-3">
      {estFinDeSemaine(jour) && (
        <p className="rounded-xl bg-carte p-3 text-base text-discret">Fin de semaine : rien n&apos;est planifié par le Cerveau.</p>
      )}
      {evenements.length === 0 && <p className="rounded-2xl bg-carte p-6 text-lg">Rien à l&apos;agenda. 🌤️</p>}
      <ul className="flex flex-col gap-2">
        {evenements.map((e) => (
          <Ligne key={e.google_id} e={e} ouvrir={ouvrir} />
        ))}
      </ul>
      {conflits.length > 0 && (
        <div className="rounded-2xl border-l-4 border-l-alerte bg-alerte-fond p-4 text-base">
          <p className="font-bold text-alerte">⚠️ Conflits d&apos;horaire</p>
          {conflits.map(([a, b]) => (
            <p key={a + b}>
              « {a} » et « {b} » se chevauchent.
            </p>
          ))}
        </div>
      )}
      {trous.length > 0 && (
        <div className="rounded-2xl bg-carte p-4 text-base">
          <p className="font-bold">🕳️ Plages libres (9 h à 17 h)</p>
          {trous.map((t) => (
            <p key={t.de}>
              {t.de} à {t.a} <span className="text-discret">({t.minutes} min)</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Ligne({ e, ouvrir, compact = false }: { e: Evenement; ouvrir: (e: Evenement) => void; compact?: boolean }) {
  const cat = infoCategorie(e.categorie ?? e.categorie_auto);
  return (
    <li>
      <button
        onClick={() => ouvrir(e)}
        className={`flex w-full gap-3 rounded-2xl bg-carte text-left active:scale-[0.99] ${compact ? "p-3" : "p-4"}`}
      >
        <span className="w-1.5 shrink-0 rounded-full" style={{ background: cat.couleur }} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-discret">
            {e.journee_entiere ? "Toute la journée" : `${heure(e.debut)} – ${heure(e.fin)}`}
            {e.meet ? " · 🎥 Meet" : ""}
          </span>
          <span className={`block font-bold ${compact ? "text-base" : "text-lg"}`}>{e.titre}</span>
          {!compact && e.lieu && <span className="block truncate text-sm text-discret">📍 {e.lieu}</span>}
        </span>
      </button>
    </li>
  );
}
