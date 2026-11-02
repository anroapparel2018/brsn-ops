"use server";

import { refresh } from "next/cache";
import { createClientCompagnie as createClient } from "@/lib/compagnie";
import { aujourdhui } from "@/lib/date";

// Chaque action vérifie d'abord qui est connecté (elles sont joignables directement par le réseau).
async function utilisateurConnecte() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  return { supabase, user };
}

// Écrit (ou efface, si le texte est vide) une des 3 priorités du jour.
export async function enregistrerPriorite(rang: number, texte: string) {
  if (![1, 2, 3].includes(rang)) return;
  const { supabase, user } = await utilisateurConnecte();
  const propre = texte.trim().slice(0, 300);
  const jour = aujourdhui();

  if (!propre) {
    await supabase.from("priorites").delete().match({ cree_par: user.id, jour, rang });
  } else {
    await supabase
      .from("priorites")
      .upsert({ cree_par: user.id, jour, rang, texte: propre }, { onConflict: "compagnie_id,cree_par,jour,rang" });
  }
  refresh();
}

export async function cocherPriorite(id: string, faite: boolean) {
  const { supabase } = await utilisateurConnecte();
  await supabase.from("priorites").update({ faite }).eq("id", id);
  refresh();
}

export async function marquerAlerteVue(id: string) {
  const { supabase, user } = await utilisateurConnecte();
  await supabase
    .from("alertes")
    .update({ vue_le: new Date().toISOString(), vue_par: user.id })
    .eq("id", id);
  refresh();
}

// Objectif de ventes : saisie manuelle en attendant Shopify.
export async function enregistrerVentes(form: FormData) {
  const { supabase } = await utilisateurConnecte();
  const ventes = Number(String(form.get("ventes") ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(ventes)) return;
  await supabase
    .from("reglages")
    .upsert({ cle: "ventes_annee", valeur: { montant: ventes, maj: new Date().toISOString() }, maj_le: new Date().toISOString() });
  refresh();
}
