"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AGENTS } from "@/lib/agents";
import { choixReport, jourDe } from "@/lib/tri";
import { deciderAccueil, trier } from "../actions-tri";
import { montrerRetour } from "../retour";
import { STYLE_BOUTON } from "../boutons-tri";
import type { Approbation } from "../approbations/bloc-approbation";

// « Ce qui attend ton OK » : une catégorie par agent ; on l'ouvre, on lit, on décide.
export function AttendOk({ enAttente }: { enAttente: (Approbation & { reporte_au: string | null })[] }) {
  const presents = AGENTS.filter((ag) => enAttente.some((a) => a.agent === ag.id));
  const [ouvert, setOuvert] = useState<string | null>(presents.length === 1 ? presents[0].id : null);

  if (!enAttente.length) {
    return (
      <p className="rounded-2xl bg-carte p-5 text-base text-discret">
        Rien n&apos;attend ton OK. 🎉{" "}
        <Link href="/approbations" className="font-bold text-orange">
          Voir l&apos;historique →
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {presents.map((ag) => {
          const n = enAttente.filter((a) => a.agent === ag.id).length;
          const actif = ouvert === ag.id;
          return (
            <button
              key={ag.id}
              onClick={() => setOuvert(actif ? null : ag.id)}
              aria-expanded={actif}
              className={`flex h-12 items-center gap-2 rounded-full px-4 text-base font-bold ${
                actif ? "bg-[#CC5500] text-white" : "bg-carte ring-1 ring-bordure"
              }`}
            >
              <span className="text-xl leading-none">{ag.icone}</span>
              {ag.court}
              <span className={`rounded-full px-2 text-sm ${actif ? "bg-white/25" : "bg-[#CC5500] text-white"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {ouvert && (
        <ul className="flex flex-col gap-3">
          {enAttente
            .filter((a) => a.agent === ouvert)
            .map((a) => (
              <ElementOk key={a.id} a={a} />
            ))}
        </ul>
      )}

      <Link href="/approbations" className="text-base font-bold text-orange">
        Historique de mes décisions →
      </Link>
    </div>
  );
}

function ElementOk({ a }: { a: Approbation & { reporte_au: string | null } }) {
  const [enCours, demarrer] = useTransition();
  const [mode, setMode] = useState<"changer" | "reporter" | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [autre, setAutre] = useState("");
  const aujourdhui = jourDe(new Date());

  function decider(statut: "approuve" | "a_changer") {
    demarrer(async () => montrerRetour(await deciderAccueil(a.id, statut, commentaire)));
  }
  function reporter(jour: string) {
    demarrer(async () => montrerRetour(await trier("approbation", a.id, "reporter", { reporteAu: jour, titre: a.titre })));
  }

  return (
    <li className={`rounded-2xl border-l-[6px] border-[#CC5500] bg-carte p-4 ${enCours ? "pointer-events-none opacity-50" : ""}`}>
      {a.reporte_au && <span className="rounded-full bg-encre px-2 py-0.5 text-xs font-black text-white uppercase">⏰ Reporté</span>}
      <p className="mt-1 text-lg leading-snug font-black">{a.titre}</p>
      {a.details && <p className="mt-2 text-base whitespace-pre-wrap">{a.details}</p>}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button onClick={() => decider("approuve")} className={`h-12 rounded-xl text-base font-bold ${STYLE_BOUTON.accepter}`}>
          Approuver
        </button>
        <button
          onClick={() => setMode(mode === "changer" ? null : "changer")}
          aria-expanded={mode === "changer"}
          className={`h-12 rounded-xl text-base font-bold ${STYLE_BOUTON.reporter}`}
        >
          À changer
        </button>
        <button
          onClick={() => setMode(mode === "reporter" ? null : "reporter")}
          aria-expanded={mode === "reporter"}
          className={`h-12 rounded-xl text-base font-bold ${STYLE_BOUTON.supprimer}`}
        >
          Reporter
        </button>
      </div>

      {mode === "changer" && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Qu'est-ce qu'il faut changer ?"
            className="rounded-xl border-2 border-bordure bg-fond p-3 text-base outline-none focus:border-orange"
          />
          <button
            disabled={!commentaire.trim()}
            onClick={() => decider("a_changer")}
            className={`h-12 rounded-xl text-base font-bold disabled:opacity-40 ${STYLE_BOUTON.accepter}`}
          >
            Envoyer à changer
          </button>
        </div>
      )}

      {mode === "reporter" && (
        <div className="mt-2 rounded-xl border-2 border-bordure p-3">
          <div className="grid grid-cols-3 gap-2">
            {choixReport(aujourdhui).map((c) => (
              <button key={c.libelle} onClick={() => reporter(c.jour)} className="h-11 rounded-xl bg-fond text-sm font-bold ring-1 ring-bordure">
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
              aria-label="Autre date"
              className="h-11 min-w-0 flex-1 rounded-xl border-2 border-bordure bg-fond px-3 text-base"
            />
            <button
              disabled={!autre}
              onClick={() => reporter(autre)}
              className={`h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-40 ${STYLE_BOUTON.accepter}`}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
