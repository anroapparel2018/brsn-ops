"use client";

import { useTransition } from "react";
import { cocherPriorite, enregistrerPriorite } from "./actions";
import type { Priorite } from "@/lib/donnees";

// Les 3 priorités du jour : on écrit dans la case, ça s'enregistre en sortant de la case.
export function Priorites({ priorites }: { priorites: Priorite[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {[1, 2, 3].map((rang) => (
        <LignePriorite key={rang} rang={rang} priorite={priorites.find((p) => p.rang === rang)} />
      ))}
    </ol>
  );
}

function LignePriorite({ rang, priorite }: { rang: number; priorite?: Priorite }) {
  const [enCours, demarrer] = useTransition();

  function enregistrer(texte: string) {
    if (texte.trim() === (priorite?.texte ?? "")) return;
    demarrer(() => enregistrerPriorite(rang, texte));
  }

  return (
    <li className="flex items-center gap-3">
      <button
        type="button"
        disabled={!priorite || enCours}
        onClick={() => priorite && demarrer(() => cocherPriorite(priorite.id, !priorite.faite))}
        aria-label={priorite?.faite ? "Marquer comme pas faite" : "Marquer comme faite"}
        className={`flex size-12 shrink-0 items-center justify-center rounded-xl border-2 text-xl font-black ${
          priorite?.faite ? "border-orange bg-orange text-white" : "border-bordure text-discret"
        } disabled:opacity-50`}
      >
        {priorite?.faite ? "✓" : rang}
      </button>
      <input
        key={priorite?.texte ?? ""}
        defaultValue={priorite?.texte ?? ""}
        placeholder={`Priorité ${rang}`}
        maxLength={300}
        enterKeyHint="done"
        onBlur={(e) => enregistrer(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={`h-12 min-w-0 flex-1 rounded-xl border-2 border-bordure bg-fond px-3 text-lg outline-none focus:border-orange ${
          priorite?.faite ? "text-discret line-through" : ""
        }`}
      />
    </li>
  );
}
