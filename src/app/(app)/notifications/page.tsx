import { Suspense } from "react";
import Link from "next/link";
import { createClientCompagnie } from "@/lib/compagnie";
import { BoutonToutLu } from "./tout-lu";

const COULEUR: Record<string, string> = {
  rouge: "#d9534f",
  orange: "#e8833a",
  rose: "#e27aa8",
  vert: "#4caf6e",
  bleu: "#4a8fd9",
  violet: "#9466d6",
  jaune: "#e3c23d",
};

// Centre de notifications interne (rouge = attend ta réponse, vert = lu et à jour).
export default function Notifications() {
  return (
    <>
      <h1 className="text-3xl font-black">Notifications</h1>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-carte" />}>
        <Liste />
      </Suspense>
    </>
  );
}

async function Liste() {
  const supabase = await createClientCompagnie();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("notifications")
    .select("id, titre, texte, couleur, lien, groupe, lue, cree_le")
    .eq("user_id", user!.id)
    .order("cree_le", { ascending: false })
    .limit(100);
  const liste = data ?? [];

  // Regroupe les notifications semblables (même groupe) : on garde la plus récente + le nombre.
  const groupes = new Map<string, { n: (typeof liste)[number]; total: number }>();
  for (const n of liste) {
    const cle = n.groupe ?? n.id;
    const g = groupes.get(cle);
    if (g) g.total++;
    else groupes.set(cle, { n, total: 1 });
  }

  if (!liste.length) {
    return <p className="mt-6 rounded-2xl bg-carte p-6 text-lg">Rien de nouveau. Tout est à jour. ✅</p>;
  }
  return (
    <>
      {liste.some((n) => !n.lue) && <BoutonToutLu />}
      <ul className="mt-4 flex flex-col gap-2">
        {[...groupes.values()].map(({ n, total }) => (
          <li key={n.id}>
            <Link
              href={n.lien ?? "/"}
              className={`flex gap-3 rounded-2xl bg-carte p-4 ${n.lue ? "opacity-60" : ""}`}
            >
              <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: n.lue ? COULEUR.vert : COULEUR[n.couleur] }} />
              <span className="min-w-0">
                <span className="block text-base font-bold">
                  {n.titre}
                  {total > 1 ? ` (${total})` : ""}
                </span>
                {n.texte && <span className="block text-sm text-discret">{n.texte}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
