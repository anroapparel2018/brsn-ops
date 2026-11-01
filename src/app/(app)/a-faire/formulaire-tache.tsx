"use client";

import { useState, useTransition } from "react";
import { AGENTS } from "@/lib/agents";
import { CATEGORIES } from "@/lib/taches";
import { creerTache, type NouvelleTache } from "../actions-taches";

const champ =
  "h-12 w-full rounded-xl border-2 border-bordure bg-fond px-3 text-base outline-none focus:border-orange";

// Valeur d'un champ « datetime-local » → ISO (l'heure locale du téléphone).
export function versIso(local: string) {
  return local ? new Date(local).toISOString() : null;
}

export function FormulaireTache({
  initial,
  envoyer,
  surFin,
  libelle = "Ajouter la tâche",
}: {
  initial?: Partial<NouvelleTache> & { rappelLocal?: string };
  envoyer?: (t: NouvelleTache) => Promise<{ erreur?: string }>;
  surFin?: () => void;
  libelle?: string;
}) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function soumettre(form: FormData) {
    const t: NouvelleTache = {
      titre: String(form.get("titre") ?? ""),
      details: String(form.get("details") ?? ""),
      agent: String(form.get("agent")),
      categorie: String(form.get("categorie")),
      echeance: String(form.get("echeance") ?? "") || null,
      rappel_le: versIso(String(form.get("rappel") ?? "")),
    };
    demarrer(async () => {
      const res = await (envoyer ?? creerTache)(t);
      if (res.erreur) setErreur(res.erreur);
      else surFin?.();
    });
  }

  return (
    <form action={soumettre} className="flex flex-col gap-3">
      <input name="titre" required defaultValue={initial?.titre} placeholder="Quoi faire ?" className={champ} />
      <textarea
        name="details"
        rows={2}
        defaultValue={initial?.details}
        placeholder="Détails (facultatif)"
        className="rounded-xl border-2 border-bordure bg-fond p-3 text-base outline-none focus:border-orange"
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Agent
          <select name="agent" defaultValue={initial?.agent ?? "cerveau"} className={champ}>
            {AGENTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icone} {a.court}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Quand
          <select name="categorie" defaultValue={initial?.categorie ?? "semaine"} className={champ}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icone} {c.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Date (facultatif)
          <input type="date" name="echeance" defaultValue={initial?.echeance ?? ""} className={champ} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Rappel (facultatif)
          <input type="datetime-local" name="rappel" defaultValue={initial?.rappelLocal ?? ""} className={champ} />
        </label>
      </div>
      <button
        type="submit"
        disabled={enCours}
        className="h-14 rounded-xl bg-orange text-lg font-bold text-white active:scale-[0.98] disabled:opacity-60"
      >
        {enCours ? "Enregistrement…" : libelle}
      </button>
      {erreur && <p className="text-base text-orange">{erreur}</p>}
    </form>
  );
}
