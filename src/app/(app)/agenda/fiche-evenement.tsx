"use client";

import { useTransition } from "react";
import { CATEGORIES_AGENDA, infoCategorie } from "@/lib/categories-agenda";
import { heure, jourDe, nomJour } from "@/lib/jours";
import type { Evenement } from "@/lib/donnees";
import { changerCategorie } from "./actions";

// Description : les lignes « - [ ] » / « - [x] » deviennent une checklist (affichage seulement).
function Description({ texte }: { texte: string }) {
  const propre = texte.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
  return (
    <ul className="flex flex-col gap-1">
      {propre.split("\n").map((ligne, i) => {
        const m = /^\s*[-*]?\s*\[( |x|X)\]\s*(.*)$/.exec(ligne);
        return m ? (
          <li key={i} className="flex gap-2">
            <span>{m[1].trim() ? "☑️" : "⬜"}</span>
            <span className={m[1].trim() ? "text-discret line-through" : ""}>{m[2]}</span>
          </li>
        ) : (
          <li key={i} className="min-h-[1em] whitespace-pre-wrap">
            {ligne}
          </li>
        );
      })}
    </ul>
  );
}

export function FicheEvenement({ e, fermer }: { e: Evenement; fermer: () => void }) {
  const [enCours, demarrer] = useTransition();
  const cat = infoCategorie(e.categorie ?? e.categorie_auto);

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/60" onClick={fermer}>
      <div
        onClick={(x) => x.stopPropagation()}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-fond p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="border-l-4 pl-3" style={{ borderColor: cat.couleur }}>
            <p className="text-sm font-semibold text-discret first-letter:uppercase">
              {nomJour(jourDe(e.debut))} · {e.journee_entiere ? "Toute la journée" : `${heure(e.debut)} à ${heure(e.fin)}`}
            </p>
            <h2 className="mt-1 text-2xl font-black">{e.titre}</h2>
          </div>
          <button onClick={fermer} className="h-11 shrink-0 rounded-xl px-3 text-base font-semibold text-discret">
            Fermer
          </button>
        </div>

        {e.meet && (
          <a href={e.meet} target="_blank" rel="noreferrer" className="mt-4 flex h-14 items-center justify-center rounded-xl bg-orange text-lg font-bold text-white">
            🎥 Rejoindre Google Meet
          </a>
        )}
        {e.lieu && (
          <a
            href={`https://maps.apple.com/?q=${encodeURIComponent(e.lieu)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block rounded-xl bg-carte p-3 text-base"
          >
            📍 {e.lieu}
          </a>
        )}
        {e.description && (
          <div className="mt-3 rounded-xl bg-carte p-3 text-base">
            <Description texte={e.description} />
          </div>
        )}
        {e.invites.length > 0 && (
          <div className="mt-3 rounded-xl bg-carte p-3 text-base">
            <p className="font-bold">👥 Invités ({e.invites.length})</p>
            <ul className="mt-1">
              {e.invites.map((i) => (
                <li key={i.nom}>
                  {i.nom}
                  {i.reponse === "accepted" ? " ✅" : i.reponse === "declined" ? " ❌" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-5 text-base font-bold">Catégorie</p>
        <div className={`mt-2 grid grid-cols-2 gap-2 ${enCours ? "opacity-60" : ""}`}>
          {CATEGORIES_AGENDA.map((c) => (
            <button
              key={c.id}
              onClick={() => demarrer(() => changerCategorie(e.google_id, c.id))}
              className={`flex h-12 items-center gap-2 rounded-xl border-2 px-3 text-left text-sm font-bold ${
                cat.id === c.id ? "border-texte" : "border-bordure"
              }`}
            >
              <span className="size-4 shrink-0 rounded-full" style={{ background: c.couleur }} />
              {c.nom}
            </button>
          ))}
        </div>

        {e.lien_google && (
          <a href={e.lien_google} target="_blank" rel="noreferrer" className="mt-4 block text-center text-base font-semibold text-discret underline">
            Ouvrir dans Google Agenda
          </a>
        )}
        <p className="mt-2 text-center text-sm text-discret">Lecture seule : rien n&apos;est modifié dans ton Google Agenda.</p>
      </div>
    </div>
  );
}
