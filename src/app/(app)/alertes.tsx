"use client";

import { useTransition } from "react";
import { marquerAlerteVue } from "./actions";
import { trouverAgent } from "@/lib/agents";
import type { Alerte } from "@/lib/donnees";

const COULEUR = {
  urgent: "border-orange",
  important: "border-orange/50",
  info: "border-bordure",
};

export function Alertes({ alertes, anciennes }: { alertes: Alerte[]; anciennes: number }) {
  if (alertes.length === 0 && anciennes === 0) {
    return <p className="rounded-2xl bg-carte p-5 text-base text-discret">Aucune alerte. 👍</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {anciennes > 0 && (
        <li className="rounded-2xl border-l-4 border-orange bg-carte p-4">
          <p className="text-base font-bold">
            ⏳ {anciennes} approbation{anciennes > 1 ? "s attendent" : " attend"} depuis plus de 2
            jours
          </p>
        </li>
      )}
      {alertes.map((a) => (
        <LigneAlerte key={a.id} alerte={a} />
      ))}
    </ul>
  );
}

function LigneAlerte({ alerte }: { alerte: Alerte }) {
  const [enCours, demarrer] = useTransition();
  const agent = trouverAgent(alerte.agent);

  return (
    <li className={`rounded-2xl border-l-4 bg-carte p-4 ${COULEUR[alerte.niveau]}`}>
      <p className="text-sm font-semibold text-discret">
        {agent?.icone} {agent?.nom}
        {alerte.niveau === "urgent" && <span className="ml-2 text-orange">Urgent</span>}
      </p>
      <p className="mt-1 text-base font-bold">{alerte.titre}</p>
      {alerte.details && <p className="mt-1 text-base text-discret">{alerte.details}</p>}
      <button
        onClick={() => demarrer(() => marquerAlerteVue(alerte.id))}
        disabled={enCours}
        className="mt-3 h-10 rounded-lg border-2 border-bordure px-4 text-sm font-semibold disabled:opacity-50"
      >
        {enCours ? "…" : "OK, vu"}
      </button>
    </li>
  );
}
