"use client";

import { useTransition } from "react";
import { deconnecterGoogle } from "../agenda/actions";

// Réglages : état du Google Agenda (lecture seule) et déconnexion.
export function ReglageGoogle({ connecte, derniereSynchro }: { connecte: boolean; derniereSynchro: string | null }) {
  const [enCours, demarrer] = useTransition();
  if (!connecte) {
    return (
       
      <a href="/api/google/connexion" className="mt-3 flex h-12 items-center justify-center rounded-xl bg-orange text-base font-bold text-white">
        Connecter mon agenda Google
      </a>
    );
  }
  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-base">✅ Branché en lecture seule.</p>
      {derniereSynchro && (
        <p className="text-sm text-discret">
          Dernière mise à jour :{" "}
          {new Intl.DateTimeFormat("fr-CA", { timeZone: "America/Montreal", dateStyle: "medium", timeStyle: "short" }).format(
            new Date(derniereSynchro),
          )}
        </p>
      )}
      <button
        onClick={() => {
          if (confirm("Déconnecter ton agenda Google de BRSN OPS ? (Rien n'est touché dans Google.)")) {
            demarrer(() => deconnecterGoogle());
          }
        }}
        disabled={enCours}
        className="h-12 rounded-xl border-2 border-bordure text-base font-bold disabled:opacity-60"
      >
        Déconnecter mon agenda
      </button>
    </div>
  );
}
