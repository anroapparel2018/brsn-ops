import { Suspense } from "react";
import { createClientCompagnie as createClient } from "@/lib/compagnie";
import { jourEnMots, type Cible } from "@/lib/tri";
import { Restaurer } from "./restaurer";

const ACTIONS: Record<string, { icone: string; texte: string }> = {
  accepter: { icone: "✅", texte: "Accepté" },
  reporter: { icone: "⏰", texte: "Reporté" },
  supprimer: { icone: "🗑️", texte: "Supprimé (archivé)" },
  restaurer: { icone: "↩️", texte: "Restauré" },
  approuver: { icone: "👍", texte: "Approuvé" },
  a_changer: { icone: "✏️", texte: "À changer" },
};

const CIBLES: Record<string, string> = {
  tache: "Tâche",
  alerte: "Alerte",
  approbation: "Approbation",
  clickup: "POOL ClickUp",
};

type Ligne = {
  id: number;
  cible: Cible;
  cible_id: string;
  titre: string | null;
  action: string;
  reporte_au: string | null;
  commentaire: string | null;
  cree_le: string;
};

// Tout ce que Julien a trié : rien ne se perd, un élément supprimé se restaure d'une touche.
export default function Historique() {
  return (
    <>
      <h1 className="mt-2 text-3xl font-black">Historique</h1>
      <p className="mt-1 text-base text-discret">Tes 100 derniers choix. « Restaurer » remet l&apos;élément actif.</p>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-carte" />}>
        <Liste />
      </Suspense>
    </>
  );
}

async function Liste() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("historique_tri")
    .select("id, cible, cible_id, titre, action, reporte_au, commentaire, cree_le")
    .order("cree_le", { ascending: false })
    .limit(100);
  const lignes = (data ?? []) as Ligne[];
  if (!lignes.length) {
    return <p className="mt-6 rounded-2xl bg-carte p-5 text-base text-discret">Rien encore. Tes choix apparaîtront ici.</p>;
  }
  // Seul le choix le plus récent d'un élément peut être annulé.
  const vus = new Set<string>();
  return (
    <ul className="mt-6 flex flex-col gap-3">
      {lignes.map((l) => {
        const cle = `${l.cible}-${l.cible_id}`;
        const dernier = !vus.has(cle);
        vus.add(cle);
        const a = ACTIONS[l.action] ?? { icone: "•", texte: l.action };
        return (
          <li key={l.id} className="rounded-2xl bg-carte p-4">
            <p className="text-sm font-semibold text-discret">
              {a.icone} {a.texte}
              {l.reporte_au ? ` au ${jourEnMots(l.reporte_au)}` : ""} · {CIBLES[l.cible]} ·{" "}
              {new Date(l.cree_le).toLocaleString("fr-CA", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "America/Montreal",
              })}
            </p>
            <p className="mt-1 text-base font-bold">{l.titre ?? "(sans titre)"}</p>
            {l.commentaire && <p className="mt-1 text-base text-discret">« {l.commentaire} »</p>}
            {dernier && (l.action === "supprimer" || l.action === "reporter") && (
              <Restaurer cible={l.cible} id={l.cible_id} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
