"use client";

import { useState } from "react";
import { AGENTS } from "@/lib/agents";
import { BlocApprobation, LigneHistorique, type Approbation } from "./bloc-approbation";

// Boîte unique de tous les agents, avec filtre par agent et historique des décisions.
export function VueApprobations({
  enAttente,
  historique,
  agentFixe,
}: {
  enAttente: Approbation[];
  historique: Approbation[];
  agentFixe?: string;
}) {
  const [filtre, setFiltre] = useState<string | null>(agentFixe ?? null);
  const garder = (a: Approbation) => !filtre || a.agent === filtre;
  const agentsPresents = AGENTS.filter((ag) => enAttente.some((a) => a.agent === ag.id));
  const liste = enAttente.filter(garder);
  const decisions = historique.filter(garder);

  return (
    <>
      {!agentFixe && agentsPresents.length > 1 && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          <Puce actif={!filtre} onClick={() => setFiltre(null)}>
            Tous ({enAttente.length})
          </Puce>
          {agentsPresents.map((ag) => (
            <Puce key={ag.id} actif={filtre === ag.id} onClick={() => setFiltre(ag.id)}>
              {ag.icone} {ag.court} ({enAttente.filter((a) => a.agent === ag.id).length})
            </Puce>
          ))}
        </div>
      )}

      {liste.length ? (
        <ul className="mt-6 flex flex-col gap-4">
          {liste.map((a) => (
            <BlocApprobation key={a.id} a={a} />
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl bg-carte p-6 text-lg">
          Rien n&apos;attend ton OK. 🎉
          <span className="mt-1 block text-base text-discret">
            Quand un agent prépare quelque chose (une pub, une commande, un courriel), ça apparaît ici.
          </span>
        </p>
      )}

      {decisions.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-black">Mes décisions</h2>
          <ul className="flex flex-col gap-3">
            {decisions.map((a) => (
              <LigneHistorique key={a.id} a={a} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Puce({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`h-11 shrink-0 rounded-full border-2 px-4 text-sm font-bold ${
        actif ? "border-orange bg-orange text-white" : "border-bordure"
      }`}
    >
      {children}
    </button>
  );
}
