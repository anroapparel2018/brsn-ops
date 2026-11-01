"use client";

import { useState, useTransition } from "react";
import { genererBilan } from "./actions";
import { lireAVoixHaute } from "./micro";

// Bouton « Bilan de fin de journée » : le Cerveau résume fait / reste / demain.
export function Bilan() {
  const [enCours, demarrer] = useTransition();
  const [res, setRes] = useState<{ texte?: string; erreur?: string } | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => demarrer(async () => setRes(await genererBilan()))}
        disabled={enCours}
        className="h-14 rounded-xl border-2 border-orange text-lg font-bold text-orange disabled:opacity-60"
      >
        {enCours ? "Le Cerveau prépare ton bilan…" : "🌙 Bilan de fin de journée"}
      </button>
      {res?.erreur && <p className="text-base text-orange">{res.erreur}</p>}
      {res?.texte && (
        <div className="rounded-2xl bg-carte p-4">
          <p className="whitespace-pre-wrap text-base">{res.texte}</p>
          <button onClick={() => lireAVoixHaute(res.texte!)} className="mt-2 text-sm font-semibold text-discret">
            🔊 Écouter
          </button>
        </div>
      )}
    </div>
  );
}
