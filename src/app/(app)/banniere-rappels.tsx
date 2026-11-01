"use client";

import { useTransition } from "react";
import { trouverAgent } from "@/lib/agents";
import { formaterRappel, type Tache } from "@/lib/taches";
import { marquerRappelVu, terminerTache } from "./actions-taches";

// Bannière rouge en haut de l'app : les rappels arrivés à échéance.
export function BanniereRappels({ rappels }: { rappels: Tache[] }) {
  if (!rappels.length) return null;
  return (
    <section className="mb-6 flex flex-col gap-2" aria-label="Rappels">
      {rappels.slice(0, 5).map((r) => (
        <Rappel key={r.id} tache={r} />
      ))}
      {rappels.length > 5 && (
        <p className="text-sm font-semibold text-orange">+ {rappels.length - 5} autres rappels dans « À faire »</p>
      )}
    </section>
  );
}

function Rappel({ tache }: { tache: Tache }) {
  const [enCours, demarrer] = useTransition();
  const agent = trouverAgent(tache.agent);
  return (
    <div
      className={`rounded-2xl border border-alerte/30 border-l-4 border-l-alerte bg-alerte-fond p-4 ${enCours ? "opacity-60" : ""}`}
    >
      <p className="text-sm font-semibold text-alerte">
        ⏰ Rappel · {agent?.icone} {agent?.court} · {tache.rappel_le && formaterRappel(tache.rappel_le)}
      </p>
      <p className="mt-1 text-lg font-bold">{tache.titre}</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => demarrer(() => terminerTache(tache.id))}
          className="h-11 flex-1 rounded-xl bg-alerte text-base font-bold text-white"
        >
          Fait ✅
        </button>
        <button
          onClick={() => demarrer(() => marquerRappelVu(tache.id))}
          className="h-11 flex-1 rounded-xl border-2 border-bordure text-base font-bold"
        >
          OK, vu
        </button>
      </div>
    </div>
  );
}
