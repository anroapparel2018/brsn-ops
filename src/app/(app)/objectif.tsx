"use client";

import { useState } from "react";
import { enregistrerVentes } from "./actions";

const argent = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

// Progression vers l'objectif de 3 M$ (saisie manuelle en attendant Shopify).
export function Objectif({ ventes, objectif }: { ventes: number | null; objectif: number }) {
  const [edition, setEdition] = useState(false);
  const pct = ventes ? Math.min(100, (ventes / objectif) * 100) : 0;

  return (
    <div className="rounded-2xl bg-carte p-5">
      <p className="text-base font-semibold text-discret">Ventes de l&apos;année</p>
      <p className="text-3xl font-black">
        {ventes != null ? argent(ventes) : "—"} <span className="text-lg text-discret">/ {argent(objectif)}</span>
      </p>
      <div className="mt-3 h-4 overflow-hidden rounded-full bg-bordure">
        <div className="h-full rounded-full bg-orange" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm text-discret">
        {ventes != null ? `${pct.toFixed(1)} % de l'objectif.` : "Entre tes ventes pour voir ta progression."} Saisie
        manuelle en attendant Shopify (à brancher).
      </p>
      {edition ? (
        <form
          action={async (f) => {
            await enregistrerVentes(f);
            setEdition(false);
          }}
          className="mt-3 flex gap-2"
        >
          <input
            name="ventes"
            inputMode="decimal"
            defaultValue={ventes ?? ""}
            placeholder="Ventes à ce jour ($)"
            className="h-12 min-w-0 flex-1 rounded-xl border-2 border-bordure bg-fond px-3 text-lg outline-none focus:border-orange"
          />
          <button className="h-12 rounded-xl bg-orange px-4 text-base font-bold text-white">OK</button>
        </form>
      ) : (
        <button onClick={() => setEdition(true)} className="mt-3 h-11 rounded-xl border-2 border-bordure px-4 text-base font-semibold">
          Mettre à jour
        </button>
      )}
    </div>
  );
}
