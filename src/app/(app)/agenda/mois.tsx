"use client";

import { ajouterJours, estFinDeSemaine, lundiDe } from "@/lib/jours";
import { elementsDuJour, Pastille, type Element } from "./grille";

const ENTETES = ["L", "M", "M", "J", "V", "S", "D"];

// Vue Mois : 6 semaines, jusqu'à 3 événements par jour, toucher un jour pour l'ouvrir.
export function Mois({
  mois, // AAAA-MM
  elements,
  aujourdhui,
  choisirJour,
  ouvrir,
}: {
  mois: string;
  elements: Element[];
  aujourdhui: string;
  choisirJour: (jour: string) => void;
  ouvrir: (x: Element) => void;
}) {
  const premier = lundiDe(`${mois}-01`);
  const jours = Array.from({ length: 42 }, (_, i) => ajouterJours(premier, i));

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-bordure">
      <div className="grid grid-cols-7 border-b border-bordure">
        {ENTETES.map((l, i) => (
          <span key={i} className="py-1 text-center text-xs font-semibold text-discret">
            {l}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {jours.map((j) => {
          const els = elementsDuJour(elements, j);
          const horsMois = !j.startsWith(mois);
          return (
            <div
              key={j}
              onClick={() => choisirJour(j)}
              className={`min-h-24 border-b border-l border-bordure p-0.5 first:border-l-0 [&:nth-child(7n+1)]:border-l-0 ${
                horsMois ? "opacity-40" : ""
              } ${estFinDeSemaine(j) ? "bg-carte/40" : ""}`}
            >
              <span
                className={`mx-auto mb-0.5 flex size-6 items-center justify-center rounded-full text-xs font-black ${
                  j === aujourdhui ? "bg-orange text-white" : ""
                }`}
              >
                {Number(j.slice(8))}
              </span>
              <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                {els.slice(0, 3).map((x, i) => (
                  <Pastille key={i} x={x} ouvrir={ouvrir} />
                ))}
                {els.length > 3 && (
                  <button onClick={() => choisirJour(j)} className="text-[11px] font-bold text-discret">
                    +{els.length - 3}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
