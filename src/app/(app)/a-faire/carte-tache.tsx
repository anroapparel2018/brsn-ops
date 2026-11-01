"use client";

import { useState, useTransition } from "react";
import { trouverAgent } from "@/lib/agents";
import { formaterDate, formaterRappel, RECURRENCES, type Tache } from "@/lib/taches";
import { annulerFait, reporterTache, terminerTache } from "../actions-taches";

export function CarteTache({
  tache,
  maintenant,
  grande = false,
}: {
  tache: Tache;
  maintenant: number; // heure de chargement, fournie par le serveur
  grande?: boolean;
}) {
  const [enCours, demarrer] = useTransition();
  const [menu, setMenu] = useState(false);
  const agent = trouverAgent(tache.agent);
  const fait = tache.statut === "fait";
  const rappelPasse = !!tache.rappel_le && new Date(tache.rappel_le).getTime() <= maintenant;

  return (
    <li className={`rounded-2xl bg-carte p-4 ${enCours ? "opacity-60" : ""} ${grande ? "p-6" : ""}`}>
      <p className={`font-bold ${grande ? "text-2xl" : "text-lg"} ${fait ? "text-discret line-through" : ""}`}>
        {tache.titre}
      </p>
      {tache.details && <p className="mt-1 text-base text-discret">{tache.details}</p>}

      <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold">
        <span className="rounded-full border-2 border-bordure px-3 py-1">
          {agent?.icone} {agent?.court}
        </span>
        {tache.echeance && (
          <span className="rounded-full border-2 border-bordure px-3 py-1">📌 {formaterDate(tache.echeance)}</span>
        )}
        {tache.rappel_le && (
          <span
            className={`rounded-full border-2 px-3 py-1 ${rappelPasse && !fait ? "border-orange text-orange" : "border-bordure"}`}
          >
            ⏰ {formaterRappel(tache.rappel_le)}
          </span>
        )}
        {tache.recurrence && (
          <span className="rounded-full border-2 border-bordure px-3 py-1">🔁 {RECURRENCES[tache.recurrence]}</span>
        )}
      </div>

      {fait ? (
        <button
          onClick={() => demarrer(() => annulerFait(tache.id))}
          className="mt-3 h-11 rounded-xl border-2 border-bordure px-4 text-base font-semibold"
        >
          ↩︎ Pas fait finalement
        </button>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            disabled={enCours}
            onClick={() => demarrer(() => terminerTache(tache.id))}
            className="h-12 flex-1 rounded-xl bg-orange text-lg font-bold text-white active:scale-[0.98]"
          >
            Fait ✅
          </button>
          <button
            disabled={enCours}
            onClick={() => setMenu(!menu)}
            className="h-12 flex-1 rounded-xl border-2 border-bordure text-lg font-bold"
          >
            Reporter
          </button>
        </div>
      )}
      {menu && !fait && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(
            [
              ["demain", "Demain"],
              ["semaine", "Semaine proch."],
              ["plus_tard", "Plus tard"],
            ] as const
          ).map(([q, nom]) => (
            <button
              key={q}
              onClick={() => {
                setMenu(false);
                demarrer(() => reporterTache(tache.id, q));
              }}
              className="h-11 rounded-xl border-2 border-orange text-sm font-bold text-orange"
            >
              {nom}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
