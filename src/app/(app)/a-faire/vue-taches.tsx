"use client";

import { useState } from "react";
import { CATEGORIES, trierParImportance, type Tache } from "@/lib/taches";
import { CarteTache } from "./carte-tache";
import { FormulaireTache } from "./formulaire-tache";

export function VueTaches({
  taches,
  faites,
  maintenant,
}: {
  taches: Tache[];
  faites: Tache[];
  maintenant: number;
}) {
  const [vue, setVue] = useState<"maintenant" | "toutes">("maintenant");
  const [ajout, setAjout] = useState(false);
  const triees = trierParImportance(taches, maintenant);
  const prochaine = triees[0];

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-carte p-1">
        {(
          [
            ["maintenant", "⚡ Maintenant"],
            ["toutes", `📋 Tout (${taches.length})`],
          ] as const
        ).map(([id, nom]) => (
          <button
            key={id}
            onClick={() => setVue(id)}
            className={`h-12 rounded-xl text-base font-bold ${vue === id ? "bg-orange text-white" : ""}`}
          >
            {nom}
          </button>
        ))}
      </div>

      <button
        onClick={() => setAjout(!ajout)}
        className="mt-4 h-12 w-full rounded-xl border-2 border-orange text-lg font-bold text-orange"
      >
        {ajout ? "Fermer" : "+ Nouvelle tâche"}
      </button>
      {ajout && (
        <div className="mt-3 rounded-2xl bg-carte p-4">
          <FormulaireTache surFin={() => setAjout(false)} />
        </div>
      )}

      {vue === "maintenant" ? (
        <section className="mt-6">
          <h2 className="mb-3 text-xl font-black">Ce que tu as à faire maintenant</h2>
          {prochaine ? (
            <ul>
              <CarteTache key={prochaine.id} tache={prochaine} maintenant={maintenant} grande />
            </ul>
          ) : (
            <p className="rounded-2xl bg-carte p-6 text-lg">Rien à faire. Profites-en ! 🎉</p>
          )}
          {triees.length > 1 && (
            <p className="mt-3 text-base text-discret">
              Ensuite : {triees[1].titre}
              {triees.length > 2 ? ` (+ ${triees.length - 2} autres)` : ""}
            </p>
          )}
        </section>
      ) : (
        <>
          {CATEGORIES.map((c) => {
            const liste = triees.filter((t) => t.categorie === c.id);
            if (!liste.length) return null;
            return (
              <section key={c.id} className="mt-8">
                <h2 className="mb-3 text-xl font-black">
                  {c.icone} {c.nom} <span className="text-discret">({liste.length})</span>
                </h2>
                <ul className="flex flex-col gap-3">
                  {liste.map((t) => (
                    <CarteTache key={t.id} tache={t} maintenant={maintenant} />
                  ))}
                </ul>
              </section>
            );
          })}
          {faites.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-xl font-black">✅ Fait récemment</h2>
              <ul className="flex flex-col gap-3">
                {faites.map((t) => (
                  <CarteTache key={t.id} tache={t} maintenant={maintenant} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
