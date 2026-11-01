import { Suspense } from "react";
import { createClientCompagnie } from "@/lib/compagnie";
import { TousLesOutils } from "./tous-les-outils";

// « Tous mes outils » : les outils des agents de ma compagnie, au même endroit (registre central).
export default function Outils() {
  return (
    <>
      <h1 className="text-3xl font-black">Tous mes outils</h1>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-carte" />}>
        <Liste />
      </Suspense>
    </>
  );
}

async function Liste() {
  const supabase = await createClientCompagnie();
  const { data: agents } = await supabase.from("agents").select("id").eq("actif", true);
  const ids = (agents ?? []).map((a) => a.id);
  const { data: liens } = ids.length
    ? await supabase.from("agents_outils").select("favori, outils(id, cle, nom, description, categorie, icone, lien, roles_autorises)").in("agent_id", ids)
    : { data: [] };
  const role = supabase.compagnie.role;
  const vus = new Map<string, { cle: string; nom: string; description: string; categorie: string; icone: string; lien: string; favori: boolean }>();
  for (const l of (liens ?? []) as unknown as { favori: boolean; outils: { cle: string; nom: string; description: string; categorie: string; icone: string; lien: string; roles_autorises: string[] } | null }[]) {
    const o = l.outils;
    if (!o || !o.roles_autorises.includes(role)) continue;
    const deja = vus.get(o.cle);
    vus.set(o.cle, { ...o, favori: l.favori || !!deja?.favori });
  }
  return <TousLesOutils outils={[...vus.values()]} />;
}
