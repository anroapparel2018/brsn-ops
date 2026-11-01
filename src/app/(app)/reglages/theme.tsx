"use client";

import { useSyncExternalStore } from "react";

const lire = () => (typeof document !== "undefined" && document.documentElement.classList.contains("clair") ? "clair" : "sombre");
const abonner = (f: () => void) => {
  const o = new MutationObserver(f);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => o.disconnect();
};

// Choix du mode d'affichage (sombre par défaut).
export function ChoixTheme() {
  const theme = useSyncExternalStore(abonner, lire, () => "sombre");

  function choisir(t: "sombre" | "clair") {
    document.documentElement.classList.toggle("clair", t === "clair");
    try {
      localStorage.setItem("theme", t);
    } catch {}
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {(
        [
          ["sombre", "🌙 Sombre"],
          ["clair", "☀️ Clair"],
        ] as const
      ).map(([t, nom]) => (
        <button
          key={t}
          onClick={() => choisir(t)}
          className={`h-12 rounded-xl border-2 text-base font-bold ${theme === t ? "border-orange bg-orange text-white" : "border-bordure"}`}
        >
          {nom}
        </button>
      ))}
    </div>
  );
}
