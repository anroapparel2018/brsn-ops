import Link from "next/link";
import type { Carte, Ton } from "@/lib/accueil";
import { BoutonsTri } from "../boutons-tri";

// Couleur de chaque carte selon ce qu'elle touche (fixe partout dans l'app).
export const TONS: Record<Ton, { couleur: string; libelle: string }> = {
  urgent: { couleur: "#D64545", libelle: "Urgent" },
  argent: { couleur: "#CC5500", libelle: "Argent" },
  clients: { couleur: "#C2477F", libelle: "Clients" },
  employes: { couleur: "#3B7DD8", libelle: "Employés" },
  neutre: { couleur: "#6B6B6B", libelle: "À faire" },
};

export function fondTeinte(couleur: string, pct = 14) {
  return { background: `color-mix(in srgb, ${couleur} ${pct}%, var(--carte))`, borderColor: couleur };
}

// Une carte de priorité : rang, titre d'une ligne, pourquoi, puis les 3 boutons.
export function CartePriorite({ c, rang }: { c: Carte; rang?: number }) {
  const ton = TONS[c.ton];
  const externe = c.lien?.startsWith("http");
  return (
    <li className="rounded-2xl border-l-[6px] p-4" style={fondTeinte(ton.couleur)}>
      <div className="flex items-center gap-2 text-xs font-black tracking-wide uppercase">
        {rang && (
          <span className="flex size-6 items-center justify-center rounded-full text-white" style={{ background: ton.couleur }}>
            {rang}
          </span>
        )}
        {c.reporte && <span className="rounded-full bg-encre px-2 py-0.5 text-white">⏰ Reporté</span>}
        <span style={{ color: ton.couleur }}>{ton.libelle}</span>
        <span className="ml-auto truncate font-semibold tracking-normal text-discret normal-case">{c.source}</span>
      </div>
      {c.lien ? (
        <Link
          href={c.lien}
          target={externe ? "_blank" : undefined}
          className="mt-2 block truncate text-lg leading-snug font-black"
        >
          {c.titre}
        </Link>
      ) : (
        <p className="mt-2 truncate text-lg leading-snug font-black">{c.titre}</p>
      )}
      <p className="mt-1 text-base text-discret">{c.pourquoi}</p>
      <BoutonsTri cible={c.cible} id={c.id} titre={c.titre} />
    </li>
  );
}
