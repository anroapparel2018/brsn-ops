"use client";

import { useState, useTransition } from "react";
import { infoCategorie } from "@/lib/categories-agenda";
import { heure, jourDe, nomJour } from "@/lib/jours";
import type { DemandeEvenement } from "@/lib/donnees";
import { approuverDemande, refuserDemande } from "./actions";

// Une demande d'événement : Approuver (création dans Google Agenda) ou Refuser.
export function CarteDemande({ d, apres }: { d: DemandeEvenement; apres?: () => void }) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const cat = infoCategorie(d.categorie);

  return (
    <div className={`rounded-2xl border-2 border-dashed p-4 ${enCours ? "opacity-60" : ""}`} style={{ borderColor: cat.couleur }}>
      <p className="text-sm font-semibold text-discret first-letter:uppercase">
        ⏳ Demande{d.source === "cerveau" ? " du Cerveau" : ""} · {nomJour(jourDe(d.debut))} ·{" "}
        {d.journee_entiere ? "toute la journée" : `${heure(d.debut)} à ${heure(d.fin)}`}
      </p>
      <p className="mt-1 text-xl font-bold">{d.titre}</p>
      {d.lieu && <p className="mt-1 text-base">📍 {d.lieu}</p>}
      {d.meet && <p className="text-base">🎥 Lien Google Meet</p>}
      {d.invites.length > 0 && <p className="text-base">👥 {d.invites.join(", ")}</p>}
      {d.description && <p className="mt-1 whitespace-pre-wrap text-base text-discret">{d.description}</p>}
      {d.invites.length > 0 && (
        <p className="mt-2 text-sm text-alerte">En approuvant, Google enverra une invitation à ces personnes.</p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              const r = await approuverDemande(d.id);
              if (r.erreur) setErreur(r.erreur);
              else apres?.();
            })
          }
          className="h-12 rounded-xl bg-green-600 text-base font-bold text-white"
        >
          ✓ Approuver
        </button>
        <button
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              await refuserDemande(d.id);
              apres?.();
            })
          }
          className="h-12 rounded-xl border-2 border-bordure text-base font-bold"
        >
          Refuser
        </button>
      </div>
      {enCours && <p className="mt-2 text-sm text-discret">Un instant…</p>}
      {erreur && <p className="mt-2 text-base text-alerte">{erreur}</p>}
    </div>
  );
}

export function FicheDemande({ d, fermer }: { d: DemandeEvenement; fermer: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/60" onClick={fermer}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-3xl bg-fond p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <div className="mb-3 flex justify-end">
          <button onClick={fermer} className="h-11 px-3 text-base font-semibold text-discret">
            Fermer
          </button>
        </div>
        <CarteDemande d={d} apres={fermer} />
      </div>
    </div>
  );
}
