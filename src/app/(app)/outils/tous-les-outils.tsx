"use client";

import Link from "next/link";
import { useState } from "react";

type Outil = { cle: string; nom: string; description: string; categorie: string; icone: string; lien: string; favori: boolean };

// Grosses tuiles groupées par catégorie, recherche et favoris en haut.
export function TousLesOutils({ outils }: { outils: Outil[] }) {
  const [q, setQ] = useState("");
  const filtre = q.trim().toLowerCase();
  const liste = outils.filter((o) => !filtre || `${o.nom} ${o.description}`.toLowerCase().includes(filtre));
  const categories = [...new Set(liste.map((o) => (o.favori ? "⭐ Favoris" : o.categorie)))].sort((a, b) =>
    a.startsWith("⭐") ? -1 : b.startsWith("⭐") ? 1 : a.localeCompare(b),
  );

  if (!outils.length) {
    return <p className="mt-6 rounded-2xl bg-carte p-6 text-lg">Aucun outil pour l&apos;instant. Ton administrateur peut en ajouter à tes agents.</p>;
  }
  return (
    <>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un outil…"
        className="mt-6 h-14 w-full rounded-xl border-2 border-bordure bg-fond px-4 text-lg outline-none focus:border-orange"
      />
      {categories.map((cat) => (
        <section key={cat} className="mt-6">
          <h2 className="mb-3 text-lg font-black">{cat}</h2>
          <ul className="grid grid-cols-2 gap-2">
            {liste
              .filter((o) => (o.favori ? "⭐ Favoris" : o.categorie) === cat)
              .map((o) => (
                <li key={o.cle}>
                  <Link href={o.lien} prefetch className="flex h-full min-h-28 flex-col gap-1 rounded-2xl bg-carte p-3 active:scale-[0.98]">
                    <span className="text-3xl leading-none">{o.icone}</span>
                    <span className="text-base font-bold leading-tight">{o.nom}</span>
                    <span className="line-clamp-2 text-sm text-discret">{o.description}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
