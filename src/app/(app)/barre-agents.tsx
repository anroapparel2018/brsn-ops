"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AGENTS, lienAgent } from "@/lib/agents";

const LIENS = [
  { href: "/", icone: "🧠", court: "Cerveau" },
  { href: "/approbations", icone: "✅", court: "Approbations" },
  ...AGENTS.filter((a) => a.id !== "cerveau").map((a) => ({
    href: lienAgent(a.id),
    icone: a.icone,
    court: a.court,
  })),
];

// Barre du bas : défile de côté sur téléphone pour voir tous les agents.
export function BarreAgents() {
  const chemin = usePathname();

  return (
    <nav
      aria-label="Agents"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-bordure bg-fond/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none]">
        {LIENS.map((l) => {
          const actif = chemin === l.href;
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-current={actif ? "page" : undefined}
                className={`flex h-16 w-20 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold ${
                  actif ? "bg-orange text-white" : "text-discret"
                }`}
              >
                <span className="text-2xl leading-none">{l.icone}</span>
                {l.court}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
