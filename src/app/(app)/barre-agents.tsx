"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AGENTS, lienAgent } from "@/lib/agents";

const ONGLETS = [
  { href: "/", icone: "🧠", nom: "Accueil" },
  { href: "/a-faire", icone: "✅", nom: "À faire" },
  { href: "/agenda", icone: "📅", nom: "Agenda" },
  { href: "/approbations", icone: "📥", nom: "Approb." },
];

// Barre du bas : Accueil, À faire, Approbations et le menu des agents (2 touches maximum).
export function BarreAgents({ enAttente = 0 }: { enAttente?: number }) {
  const chemin = usePathname();
  const [menu, setMenu] = useState(false);
  const dansAgents = chemin.startsWith("/agents") || chemin.startsWith("/reglages") || chemin.startsWith("/recherche");

  return (
    <>
      {menu && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/60" onClick={() => setMenu(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-3xl bg-fond p-5 pb-[calc(6rem+env(safe-area-inset-bottom))]"
          >
            <h2 className="mb-4 text-2xl font-black">Les agents</h2>
            <ul className="grid grid-cols-3 gap-2">
              {AGENTS.filter((a) => a.id !== "cerveau").map((a) => (
                <li key={a.id}>
                  <Link
                    href={lienAgent(a.id)}
                    onClick={() => setMenu(false)}
                    className="flex h-24 flex-col items-center justify-center gap-1 rounded-2xl bg-carte text-center text-sm font-bold"
                  >
                    <span className="text-3xl leading-none">{a.icone}</span>
                    {a.nom}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Link
                href="/outils"
                onClick={() => setMenu(false)}
                className="flex h-14 items-center justify-center rounded-2xl border-2 border-bordure text-base font-bold"
              >
                🧰 Outils
              </Link>
              <Link
                href="/recherche"
                onClick={() => setMenu(false)}
                className="flex h-14 items-center justify-center rounded-2xl border-2 border-bordure text-base font-bold"
              >
                🔎 Rechercher
              </Link>
              <Link
                href="/reglages"
                onClick={() => setMenu(false)}
                className="flex h-14 items-center justify-center rounded-2xl border-2 border-bordure text-base font-bold"
              >
                ⚙️ Réglages
              </Link>
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-bordure bg-fond/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-5 gap-1 px-2 py-2">
          {ONGLETS.map((o) => {
            const actif = chemin === o.href && !menu;
            return (
              <li key={o.href}>
                <Link
                  href={o.href}
                  onClick={() => setMenu(false)}
                  aria-current={actif ? "page" : undefined}
                  className={`relative flex h-16 flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold ${
                    actif ? "bg-orange text-white" : "text-discret"
                  }`}
                >
                  <span className="text-2xl leading-none">{o.icone}</span>
                  {o.nom}
                  {o.href === "/approbations" && enAttente > 0 && (
                    <span className="absolute top-1 right-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-alerte px-1 text-xs font-black text-white">
                      {enAttente}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
              className={`flex h-16 w-full flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold ${
                menu || dansAgents ? "bg-orange text-white" : "text-discret"
              }`}
            >
              <span className="text-2xl leading-none">🤖</span>
              Agents
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
