"use client";

import { useEffect, useState, useTransition } from "react";
import type { Retour as RetourAction } from "@/lib/tri";
import { trier } from "./actions-tri";

// Retour visible après chaque choix : ce qui vient de se passer, ce qui arrive ensuite, et « Annuler ».
const EVENEMENT = "brsn:retour";

export function montrerRetour(r: RetourAction) {
  window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: r }));
}

export function ZoneRetour() {
  const [retour, setRetour] = useState<(RetourAction & { cle: number }) | null>(null);
  const [enCours, demarrer] = useTransition();

  useEffect(() => {
    const surRetour = (e: Event) => setRetour({ ...(e as CustomEvent<RetourAction>).detail, cle: Date.now() });
    window.addEventListener(EVENEMENT, surRetour);
    return () => window.removeEventListener(EVENEMENT, surRetour);
  }, []);

  useEffect(() => {
    if (!retour) return;
    const minuterie = setTimeout(() => setRetour(null), retour.ok ? 12000 : 15000);
    return () => clearTimeout(minuterie);
  }, [retour]);

  if (!retour) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-xl rounded-2xl bg-encre p-4 text-white shadow-2xl ring-1 ring-white/10"
    >
      <p className="text-base font-bold">
        {retour.ok ? "✓ " : "⚠️ "}
        {retour.message}
      </p>
      {retour.ensuite && <p className="mt-1 text-sm text-white/80">{retour.ensuite}</p>}
      <div className="mt-2 flex justify-end gap-2">
        {retour.annuler && (
          <button
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                const r = await trier(retour.annuler!.cible, retour.annuler!.id, "restaurer");
                setRetour({ ...r, message: r.ok ? "Annulé : c'est revenu comme avant." : r.message, annuler: undefined, cle: Date.now() });
              })
            }
            className="h-10 rounded-xl bg-white/15 px-4 text-sm font-bold"
          >
            Annuler
          </button>
        )}
        <button onClick={() => setRetour(null)} className="h-10 rounded-xl px-3 text-sm font-semibold text-white/80">
          OK
        </button>
      </div>
    </div>
  );
}
