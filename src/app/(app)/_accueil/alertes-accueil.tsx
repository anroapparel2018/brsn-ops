import { trouverAgent } from "@/lib/agents";
import type { Alerte } from "@/lib/donnees";
import { BoutonsTri } from "../boutons-tri";
import { fondTeinte } from "./cartes";

const GRAVITE = {
  urgent: { couleur: "#D64545", libelle: "Urgent" },
  important: { couleur: "#CC5500", libelle: "Important" },
  info: { couleur: "#6B6B6B", libelle: "Info" },
};

// Chaque alerte : ce qui se passe, pourquoi c'est important, l'action proposée.
// Accepter crée une tâche dans le POOL ClickUp (à trier, sans date limite).
export function AlertesAccueil({ alertes }: { alertes: Alerte[] }) {
  if (!alertes.length) {
    return <p className="rounded-2xl bg-carte p-5 text-base text-discret">Aucune alerte. 👍</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {alertes.map((a) => {
        const g = GRAVITE[a.niveau];
        const agent = trouverAgent(a.agent);
        return (
          <li key={a.id} className="rounded-2xl border-l-[6px] p-4" style={fondTeinte(g.couleur, a.niveau === "info" ? 6 : 14)}>
            <p className="flex items-center gap-2 text-xs font-black tracking-wide uppercase">
              <span className="rounded-full px-2 py-0.5 text-white" style={{ background: g.couleur }}>
                {g.libelle}
              </span>
              <span className="truncate font-semibold tracking-normal text-discret normal-case">
                {agent?.icone} {agent?.nom}
              </span>
            </p>
            <p className="mt-2 text-lg leading-snug font-black">{a.titre}</p>
            {a.pourquoi && <p className="mt-1 text-base">Pourquoi : {a.pourquoi}</p>}
            {a.action && <p className="mt-1 text-base font-semibold">👉 {a.action}</p>}
            {!a.pourquoi && !a.action && a.details && <p className="mt-1 text-base text-discret">{a.details}</p>}
            <BoutonsTri cible="alerte" id={a.id} titre={a.titre} libelleAccepter="Accepter" />
            <p className="mt-2 text-xs text-discret">Accepter crée une tâche dans ton POOL ClickUp (à trier, sans date).</p>
          </li>
        );
      })}
    </ul>
  );
}
