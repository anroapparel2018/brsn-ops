"use client";

import { useState, useTransition } from "react";
import { creerLienClaude, revoquerLienClaude } from "./actions-claude";

export type LienClaude = {
  id: string;
  nom: string;
  apercu: string;
  cree_le: string;
  dernier_usage_le: string | null;
};

const date = (iso: string) =>
  new Date(iso).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" });

// Liens du connecteur Claude : en créer un (montré une seule fois), voir l'usage, révoquer.
export function PontClaude({ liens }: { liens: LienClaude[] }) {
  const [enCours, demarrer] = useTransition();
  const [nouveau, setNouveau] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function creer() {
    demarrer(async () => {
      const res = await creerLienClaude("Claude");
      if (res.erreur) setErreur(res.erreur);
      else if (res.lien) {
        setNouveau(res.lien);
        setCopie(false);
      }
    });
  }

  async function copier() {
    if (!nouveau) return;
    try {
      await navigator.clipboard.writeText(nouveau);
      setCopie(true);
    } catch {
      setErreur("Copie impossible : sélectionne le lien et copie-le à la main.");
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <p className="text-base text-discret">
        Ce lien permet à Claude de créer tes tâches, rappels, approbations, notes et décisions ici. Garde-le secret comme
        un mot de passe.
      </p>

      {nouveau ? (
        <div className="rounded-xl border-2 border-orange p-3">
          <p className="text-sm font-bold">Ton lien (montré une seule fois) :</p>
          <p className="mt-1 text-sm break-all select-all">{nouveau}</p>
          <button onClick={copier} className="mt-2 h-12 w-full rounded-xl bg-orange text-base font-bold text-white">
            {copie ? "✅ Copié" : "Copier le lien"}
          </button>
          <p className="mt-2 text-sm text-discret">
            Dans Claude : Réglages → Connecteurs → Ajouter un connecteur personnalisé → colle ce lien.
          </p>
        </div>
      ) : (
        <button
          onClick={creer}
          disabled={enCours}
          className="h-12 rounded-xl bg-orange text-base font-bold text-white disabled:opacity-60"
        >
          {enCours ? "Je crée le lien…" : "Créer un lien pour Claude"}
        </button>
      )}
      {erreur && <p className="text-base text-orange">{erreur}</p>}

      {liens.length > 0 && (
        <ul className="flex flex-col gap-2">
          {liens.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 rounded-xl border-2 border-bordure p-3">
              <span className="min-w-0 text-sm">
                <span className="block font-bold">
                  {l.nom} · …{l.apercu}
                </span>
                <span className="block text-discret">
                  Créé le {date(l.cree_le)} · {l.dernier_usage_le ? `utilisé le ${date(l.dernier_usage_le)}` : "jamais utilisé"}
                </span>
              </span>
              <button
                onClick={() => demarrer(() => revoquerLienClaude(l.id))}
                disabled={enCours}
                className="h-11 shrink-0 rounded-xl border-2 border-bordure px-3 text-sm font-bold"
              >
                Révoquer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
