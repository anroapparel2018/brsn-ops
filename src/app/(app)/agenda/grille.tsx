"use client";

import { useEffect, useRef } from "react";
import { HEURE_DEBUT, HEURE_FIN, PX_HEURE, minutesLocales, placer } from "@/lib/agenda-grille";
import { infoCategorie } from "@/lib/categories-agenda";
import { estFinDeSemaine, heure, jourDe, jourSemaine } from "@/lib/jours";
import type { DemandeEvenement, Evenement } from "@/lib/donnees";

export type Element =
  | { type: "evenement"; e: Evenement; debut: string; fin: string }
  | { type: "demande"; d: DemandeEvenement; debut: string; fin: string };

const LETTRES = ["D", "L", "M", "M", "J", "V", "S"];
const HEURES = Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => HEURE_DEBUT + i);

export const couleurDe = (x: Element) =>
  infoCategorie(x.type === "evenement" ? (x.e.categorie ?? x.e.categorie_auto) : x.d.categorie).couleur;
export const titreDe = (x: Element) => (x.type === "evenement" ? x.e.titre : `⏳ ${x.d.titre}`);
const toutLeJour = (x: Element) => (x.type === "evenement" ? x.e.journee_entiere : x.d.journee_entiere);

export const elementsDuJour = (els: Element[], jour: string) =>
  els.filter((x) => (toutLeJour(x) ? jourDe(x.debut) <= jour && jour < jourDe(x.fin) : jourDe(x.debut) === jour));

// Grille horaire (vue Jour : 1 colonne, vue Semaine : 7 colonnes), comme Google Agenda.
export function Grille({
  jours,
  elements,
  aujourdhui,
  maintenant,
  ouvrir,
  creerA,
  choisirJour,
}: {
  jours: string[];
  elements: Element[];
  aujourdhui: string;
  maintenant: string;
  ouvrir: (x: Element) => void;
  creerA: (jour: string, minutes: number) => void;
  choisirJour?: (jour: string) => void;
}) {
  const defile = useRef<HTMLDivElement>(null);
  const semaine = jours.length > 1;

  // Ouvre la grille vers 8 h (ou l'heure actuelle).
  useEffect(() => {
    const h = Math.max(8, Math.min(minutesLocales(maintenant) / 60 - 1, 18));
    defile.current?.scrollTo({ top: (h - HEURE_DEBUT) * PX_HEURE });
  }, [maintenant]);

  const ligneMaintenant = ((minutesLocales(maintenant) - HEURE_DEBUT * 60) / 60) * PX_HEURE;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-bordure">
      {/* En-tête des jours (semaine) */}
      {semaine && (
        <div className="grid border-b border-bordure" style={{ gridTemplateColumns: `2.5rem repeat(${jours.length}, 1fr)` }}>
          <span />
          {jours.map((j) => (
            <button
              key={j}
              onClick={() => choisirJour?.(j)}
              className={`py-1 text-center ${estFinDeSemaine(j) ? "opacity-50" : ""}`}
            >
              <span className="block text-xs font-semibold text-discret">{LETTRES[jourSemaine(j)]}</span>
              <span
                className={`mx-auto flex size-7 items-center justify-center rounded-full text-sm font-black ${
                  j === aujourdhui ? "bg-orange text-white" : ""
                }`}
              >
                {Number(j.slice(8))}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Toute la journée */}
      {jours.some((j) => elementsDuJour(elements, j).some(toutLeJour)) && (
        <div className="grid border-b border-bordure" style={{ gridTemplateColumns: `2.5rem repeat(${jours.length}, 1fr)` }}>
          <span className="self-center text-center text-[11px] text-discret">jour</span>
          {jours.map((j) => (
            <div key={j} className="flex min-w-0 flex-col gap-0.5 p-0.5">
              {elementsDuJour(elements, j)
                .filter(toutLeJour)
                .map((x, i) => (
                  <Pastille key={i} x={x} ouvrir={ouvrir} />
                ))}
            </div>
          ))}
        </div>
      )}

      {/* Heures */}
      <div ref={defile} className="max-h-[60dvh] overflow-y-auto">
        <div className="relative grid" style={{ gridTemplateColumns: `2.5rem repeat(${jours.length}, 1fr)` }}>
          <div>
            {HEURES.map((h) => (
              <div key={h} className="relative text-right text-[11px] text-discret" style={{ height: PX_HEURE }}>
                <span className="absolute -top-2 right-1">{h} h</span>
              </div>
            ))}
          </div>
          {jours.map((j) => (
            <div
              key={j}
              className={`relative border-l border-bordure ${estFinDeSemaine(j) ? "bg-carte/40" : ""}`}
              style={{ height: HEURES.length * PX_HEURE }}
              onClick={(ev) => {
                if (ev.target !== ev.currentTarget) return;
                const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
                creerA(j, HEURE_DEBUT * 60 + Math.floor((y / PX_HEURE) * 2) * 30);
              }}
            >
              {HEURES.map((h) => (
                <div key={h} className="pointer-events-none border-t border-bordure/60" style={{ height: PX_HEURE }} />
              ))}
              {placer(
                elementsDuJour(elements, j).filter((x) => !toutLeJour(x)),
                j,
              ).map((b, i) => (
                <button
                  key={i}
                  onClick={() => ouvrir(b.item)}
                  className={`absolute overflow-hidden rounded-md px-1 text-left leading-tight text-white ${
                    b.item.type === "demande" ? "border-2 border-dashed border-white/80 opacity-80" : ""
                  }`}
                  style={{
                    top: b.haut,
                    height: b.hauteur - 2,
                    left: `calc(${(b.colonne / b.colonnes) * 100}% + 1px)`,
                    width: `calc(${100 / b.colonnes}% - 2px)`,
                    background: couleurDe(b.item),
                  }}
                >
                  <span className={`block font-bold ${semaine ? "text-[11px]" : "text-sm"}`}>{titreDe(b.item)}</span>
                  {!semaine && b.hauteur > 34 && (
                    <span className="block text-xs opacity-90">
                      {heure(b.item.debut)} – {heure(b.item.fin)}
                    </span>
                  )}
                </button>
              ))}
              {j === aujourdhui && ligneMaintenant > 0 && ligneMaintenant < HEURES.length * PX_HEURE && (
                <div className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-alerte" style={{ top: ligneMaintenant }}>
                  <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-alerte" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Pastille({ x, ouvrir }: { x: Element; ouvrir: (x: Element) => void }) {
  return (
    <button
      onClick={() => ouvrir(x)}
      className={`block w-full truncate rounded px-1 text-left text-[11px] font-bold text-white ${
        x.type === "demande" ? "border border-dashed border-white/80 opacity-80" : ""
      }`}
      style={{ background: couleurDe(x) }}
    >
      {titreDe(x)}
    </button>
  );
}
