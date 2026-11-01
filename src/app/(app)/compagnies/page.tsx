import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mesCompagnies } from "@/lib/compagnie";
import { Assistant } from "./assistant";

// « Mes compagnies » (super-administrateur) : liste, statut, membres, agents, et l'assistant de création.
export default function Compagnies() {
  return (
    <>
      <h1 className="text-3xl font-black">Mes compagnies</h1>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-carte" />}>
        <Liste />
      </Suspense>
    </>
  );
}

async function Liste() {
  const { superAdmin } = await mesCompagnies();
  if (!superAdmin) redirect("/");
  const supabase = await createClient();
  const [{ data: compagnies }, { data: membres }, { data: agents }, { data: modeles }] = await Promise.all([
    supabase.from("compagnies").select("id, nom, statut").order("nom"),
    supabase.from("membres").select("compagnie_id").eq("actif", true),
    supabase.from("agents").select("compagnie_id").eq("actif", true),
    supabase.from("modeles_agents").select("cle, nom, icone, role").order("ordre"),
  ]);
  const compte = (l: { compagnie_id: string }[] | null, id: string) => (l ?? []).filter((x) => x.compagnie_id === id).length;
  const STATUT: Record<string, string> = { active: "🟢 Active", en_attente: "🟡 En attente", desactivee: "⚪ Désactivée" };

  return (
    <>
      <Assistant modeles={modeles ?? []} />
      <ul className="mt-6 flex flex-col gap-2">
        {(compagnies ?? []).map((c) => (
          <li key={c.id} className="rounded-2xl bg-carte p-4">
            <p className="text-lg font-bold">{c.nom}</p>
            <p className="text-sm text-discret">
              {STATUT[c.statut] ?? c.statut} · {compte(membres, c.id)} membre(s) · {compte(agents, c.id)} agent(s)
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
