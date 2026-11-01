"use client";

import { useState, useTransition } from "react";
import { CATEGORIES_AGENDA } from "@/lib/categories-agenda";
import { ajouterJours } from "@/lib/jours";
import { creerDemande } from "./actions";

const champ = "h-12 w-full rounded-xl border-2 border-bordure bg-fond px-3 text-base outline-none focus:border-orange";
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// Nouvelle demande d'événement : elle attend ton OK avant d'aller dans Google Agenda.
export function FormulaireDemande({
  jour,
  minutes,
  fermer,
}: {
  jour: string;
  minutes: number; // heure de début proposée (minutes depuis minuit)
  fermer: () => void;
}) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [journee, setJournee] = useState(false);
  const [categorie, setCategorie] = useState("rdv");

  function soumettre(f: FormData) {
    const date = String(f.get("date"));
    const debut = journee ? new Date(`${date}T00:00`) : new Date(`${date}T${f.get("debut")}`);
    const fin = journee ? new Date(`${ajouterJours(date, 1)}T00:00`) : new Date(`${date}T${f.get("fin")}`);
    demarrer(async () => {
      const r = await creerDemande({
        titre: String(f.get("titre") ?? ""),
        debut: debut.toISOString(),
        fin: fin.toISOString(),
        journee_entiere: journee,
        lieu: String(f.get("lieu") ?? ""),
        invites: String(f.get("invites") ?? "").split(/[,;\s]+/),
        meet: f.get("meet") === "on",
        categorie,
        description: String(f.get("description") ?? ""),
      });
      if (r.erreur) setErreur(r.erreur);
      else fermer();
    });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/60" onClick={fermer}>
      <form
        action={soumettre}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col gap-3 overflow-y-auto rounded-t-3xl bg-fond p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black">Nouvelle demande</h2>
          <button type="button" onClick={fermer} className="h-11 px-3 text-base font-semibold text-discret">
            Fermer
          </button>
        </div>
        <input name="titre" required autoFocus placeholder="Titre" className={champ} />
        <div className="grid grid-cols-2 gap-2">
          <input name="date" type="date" required defaultValue={jour} className={`${champ} col-span-2`} />
          {!journee && (
            <>
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Début
                <input name="debut" type="time" required defaultValue={hhmm(minutes)} className={champ} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Fin
                <input name="fin" type="time" required defaultValue={hhmm(minutes + 60)} className={champ} />
              </label>
            </>
          )}
        </div>
        <label className="flex items-center gap-3 text-base">
          <input type="checkbox" checked={journee} onChange={(e) => setJournee(e.target.checked)} className="size-6 accent-[#CC5500]" />
          Toute la journée
        </label>
        <input name="lieu" placeholder="Lieu (facultatif)" className={champ} />
        <input name="invites" inputMode="email" placeholder="Invités : courriels séparés par des virgules" className={champ} />
        <label className="flex items-center gap-3 text-base">
          <input name="meet" type="checkbox" className="size-6 accent-[#CC5500]" />
          🎥 Ajouter un lien Google Meet
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES_AGENDA.filter((c) => c.id !== "autre").map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setCategorie(c.id)}
              className={`flex h-10 items-center gap-2 rounded-full border-2 px-3 text-sm font-bold ${
                categorie === c.id ? "border-texte" : "border-bordure"
              }`}
            >
              <span className="size-3 rounded-full" style={{ background: c.couleur }} />
              {c.nom.split(",")[0]}
            </button>
          ))}
        </div>
        <textarea
          name="description"
          rows={3}
          placeholder="Description ou checklist (une ligne « - [ ] » par point)"
          className="rounded-xl border-2 border-bordure bg-fond p-3 text-base outline-none focus:border-orange"
        />
        <button disabled={enCours} className="h-14 rounded-xl bg-orange text-lg font-bold text-white disabled:opacity-60">
          {enCours ? "Enregistrement…" : "Créer la demande"}
        </button>
        <p className="text-center text-sm text-discret">
          Elle attendra ton OK (ici et dans Approbations) avant d&apos;aller dans Google Agenda.
        </p>
        {erreur && <p className="text-base text-alerte">{erreur}</p>}
      </form>
    </div>
  );
}
