"use client";

import { useState, useTransition } from "react";
import { choixReport, jourDe, type Cible } from "@/lib/tri";
import { trier } from "./actions-tri";
import { montrerRetour } from "./retour";

// Les 3 boutons du tri, toujours dans le même ordre et les mêmes couleurs partout dans l'app.
export const STYLE_BOUTON = {
  accepter: "bg-[#CC5500] text-white",
  reporter: "border-2 border-current bg-transparent",
  supprimer: "bg-bordure text-discret",
};

export function BoutonsTri({
  cible,
  id,
  titre,
  libelleAccepter = "Accepter",
}: {
  cible: Cible;
  id: string;
  titre?: string;
  libelleAccepter?: string;
}) {
  const [enCours, demarrer] = useTransition();
  const [report, setReport] = useState(false);
  const [autre, setAutre] = useState("");

  function agir(action: "accepter" | "reporter" | "supprimer", reporteAu?: string) {
    demarrer(async () => {
      const r = await trier(cible, id, action, { reporteAu, titre });
      montrerRetour(r);
      if (r.ok) setReport(false);
    });
  }

  const aujourdhui = jourDe(new Date());

  return (
    <div className={enCours ? "pointer-events-none opacity-50" : ""}>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button onClick={() => agir("accepter")} className={`h-12 rounded-xl text-base font-bold ${STYLE_BOUTON.accepter}`}>
          {libelleAccepter}
        </button>
        <button
          onClick={() => setReport(!report)}
          aria-expanded={report}
          className={`h-12 rounded-xl text-base font-bold ${STYLE_BOUTON.reporter}`}
        >
          Reporter
        </button>
        <button onClick={() => agir("supprimer")} className={`h-12 rounded-xl text-base font-bold ${STYLE_BOUTON.supprimer}`}>
          Supprimer
        </button>
      </div>

      {report && (
        <div className="mt-2 rounded-xl border-2 border-bordure p-3">
          <p className="text-sm font-bold">Elle revient quand ?</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {choixReport(aujourdhui).map((c) => (
              <button
                key={c.libelle}
                onClick={() => agir("reporter", c.jour)}
                className="h-11 rounded-xl bg-fond text-sm font-bold ring-1 ring-bordure"
              >
                {c.libelle}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="date"
              min={aujourdhui}
              value={autre}
              onChange={(e) => setAutre(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl border-2 border-bordure bg-fond px-3 text-base"
              aria-label="Autre date"
            />
            <button
              disabled={!autre}
              onClick={() => agir("reporter", autre)}
              className={`h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-40 ${STYLE_BOUTON.accepter}`}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
