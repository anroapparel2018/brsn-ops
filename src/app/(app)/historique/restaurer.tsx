"use client";

import { useTransition } from "react";
import type { Cible } from "@/lib/tri";
import { trier } from "../actions-tri";
import { montrerRetour } from "../retour";

export function Restaurer({ cible, id }: { cible: Cible; id: string }) {
  const [enCours, demarrer] = useTransition();
  return (
    <button
      disabled={enCours}
      onClick={() => demarrer(async () => montrerRetour(await trier(cible, id, "restaurer")))}
      className="mt-3 h-11 rounded-xl border-2 border-current px-4 text-sm font-bold disabled:opacity-50"
    >
      {enCours ? "…" : "↩️ Restaurer"}
    </button>
  );
}
