"use client";

import { useState, useTransition } from "react";
import type { ConfigFiches } from "@/lib/fiches";
import { formaterDate } from "@/lib/taches";
import { enregistrerFiche } from "./actions-fiches";

export type Fiche = {
  id: string;
  nom: string;
  sous_titre: string | null;
  details: string | null;
  echeance: string | null;
  donnees: Record<string, string>;
};

const champ =
  "h-12 w-full rounded-xl border-2 border-bordure bg-fond px-3 text-base outline-none focus:border-orange";

// Liste de fiches d'un type (fournisseurs, partenaires, équipe…) avec ajout et modification.
export function ListeFiches({ config, fiches, agent }: { config: ConfigFiches; fiches: Fiche[]; agent: string }) {
  const [edition, setEdition] = useState<Fiche | "nouvelle" | null>(null);

  const groupes = config.groupePar
    ? Object.entries(
        fiches.reduce<Record<string, Fiche[]>>((acc, f) => {
          const g = f.donnees?.[config.groupePar!] || "Sans catégorie";
          (acc[g] ??= []).push(f);
          return acc;
        }, {}),
      ).sort(([a], [b]) => ordre(config, a) - ordre(config, b))
    : [["", fiches] as [string, Fiche[]]];

  return (
    <section className="mt-10" id={config.type}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xl font-black">{config.titre}</h2>
        {config.imprimable && fiches.length > 0 && (
          <button
            onClick={() => window.print()}
            className="h-11 shrink-0 rounded-xl border-2 border-bordure px-3 text-sm font-bold print:hidden"
          >
            📄 Exporter en PDF
          </button>
        )}
      </div>

      {fiches.length === 0 && <p className="rounded-2xl bg-carte p-5 text-base text-discret">{config.vide}</p>}

      {groupes.map(([groupe, liste]) => (
        <div key={groupe} className="mb-4">
          {groupe && <h3 className="mb-2 text-base font-black text-orange">{groupe}</h3>}
          <ul className="flex flex-col gap-2">
            {liste.map((f) => (
              <li key={f.id}>
                <button onClick={() => setEdition(f)} className="w-full rounded-2xl bg-carte p-4 text-left">
                  <p className="text-lg font-bold">{f.nom}</p>
                  {f.sous_titre && <p className="text-base text-discret">{f.sous_titre}</p>}
                  {config.echeance && f.echeance && (
                    <p className="mt-1 text-sm font-semibold text-orange">
                      {config.echeance} : {formaterDate(f.echeance)}
                    </p>
                  )}
                  {config.champs
                    .filter((c) => c.cle !== config.groupePar && f.donnees?.[c.cle])
                    .map((c) => (
                      <p key={c.cle} className="mt-1 text-sm">
                        <span className="text-discret">{c.nom} : </span>
                        {f.donnees[c.cle]}
                      </p>
                    ))}
                  {f.details && <p className="mt-1 whitespace-pre-wrap text-sm text-discret">{f.details}</p>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {edition ? (
        <Formulaire
          config={config}
          agent={agent}
          fiche={edition === "nouvelle" ? null : edition}
          fermer={() => setEdition(null)}
        />
      ) : (
        <button
          onClick={() => setEdition("nouvelle")}
          className="mt-2 h-12 w-full rounded-xl border-2 border-orange text-base font-bold text-orange print:hidden"
        >
          + Ajouter
        </button>
      )}
    </section>
  );
}

function ordre(config: ConfigFiches, groupe: string) {
  const options = config.champs.find((c) => c.cle === config.groupePar)?.options ?? [];
  const i = options.indexOf(groupe);
  return i < 0 ? 99 : i;
}

function Formulaire({
  config,
  agent,
  fiche,
  fermer,
}: {
  config: ConfigFiches;
  agent: string;
  fiche: Fiche | null;
  fermer: () => void;
}) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function soumettre(form: FormData) {
    const donnees: Record<string, string> = {};
    for (const c of config.champs) donnees[c.cle] = String(form.get(c.cle) ?? "").trim();
    demarrer(async () => {
      const res = await enregistrerFiche({
        id: fiche?.id,
        type: config.type,
        agent,
        nom: String(form.get("nom") ?? ""),
        sous_titre: String(form.get("sous_titre") ?? ""),
        details: String(form.get("details") ?? ""),
        echeance: String(form.get("echeance") ?? "") || null,
        donnees,
        rappel: form.get("rappel") === "on",
      });
      if (res.erreur) setErreur(res.erreur);
      else fermer();
    });
  }

  return (
    <form action={soumettre} className="mt-2 flex flex-col gap-3 rounded-2xl border-2 border-orange p-4 print:hidden">
      <p className="text-lg font-black">{fiche ? "Modifier" : "Ajouter"}</p>
      <input name="nom" required defaultValue={fiche?.nom} placeholder="Nom" className={champ} />
      <input name="sous_titre" defaultValue={fiche?.sous_titre ?? ""} placeholder={config.sousTitre} className={champ} />
      {config.champs.map((c) =>
        c.type === "choix" ? (
          <label key={c.cle} className="flex flex-col gap-1 text-sm font-semibold">
            {c.nom}
            <select name={c.cle} defaultValue={fiche?.donnees?.[c.cle] ?? c.options?.[0]} className={champ}>
              {c.options?.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        ) : (
          <label key={c.cle} className="flex flex-col gap-1 text-sm font-semibold">
            {c.nom}
            <input
              name={c.cle}
              type={c.type === "date" ? "date" : c.type === "nombre" ? "number" : c.type === "lien" ? "url" : "text"}
              step={c.type === "nombre" ? "any" : undefined}
              defaultValue={fiche?.donnees?.[c.cle] ?? ""}
              className={champ}
            />
          </label>
        ),
      )}
      {config.echeance && (
        <>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {config.echeance}
            <input name="echeance" type="date" defaultValue={fiche?.echeance ?? ""} className={champ} />
          </label>
          <label className="flex items-center gap-3 text-base">
            <input name="rappel" type="checkbox" className="size-6 accent-[#CC5500]" />
            Créer un rappel 3 jours avant
          </label>
        </>
      )}
      <textarea
        name="details"
        rows={3}
        defaultValue={fiche?.details ?? ""}
        placeholder="Notes"
        className="rounded-xl border-2 border-bordure bg-fond p-3 text-base outline-none focus:border-orange"
      />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={fermer} className="h-12 rounded-xl border-2 border-bordure text-base font-bold">
          Annuler
        </button>
        <button disabled={enCours} className="h-12 rounded-xl bg-orange text-base font-bold text-white disabled:opacity-60">
          {enCours ? "…" : "Enregistrer"}
        </button>
      </div>
      {erreur && <p className="text-base text-orange">{erreur}</p>}
    </form>
  );
}
