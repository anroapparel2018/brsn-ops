"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AGENTS } from "@/lib/agents";

export type FicheSaisie = {
  id?: string;
  type: string;
  nom: string;
  sous_titre?: string;
  details?: string;
  echeance?: string | null;
  donnees?: Record<string, string>;
  rappel?: boolean; // créer une tâche avec rappel 3 jours avant l'échéance
  agent?: string;
};

export async function enregistrerFiche(f: FicheSaisie) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  const nom = f.nom.trim().slice(0, 300);
  if (!nom) return { erreur: "Écris un nom." };

  const ligne = {
    type: f.type,
    nom,
    sous_titre: f.sous_titre?.trim() || null,
    details: f.details?.trim() || null,
    echeance: f.echeance || null,
    donnees: f.donnees ?? {},
  };
  const { error } = f.id
    ? await supabase.from("fiches").update(ligne).eq("id", f.id)
    : await supabase.from("fiches").insert(ligne);
  if (error) return { erreur: "La fiche n'a pas pu être enregistrée." };

  if (f.rappel && f.echeance) {
    const rappel = new Date(`${f.echeance}T09:00:00-05:00`);
    rappel.setUTCDate(rappel.getUTCDate() - 3);
    await supabase.from("taches").insert({
      titre: `${nom} : échéance le ${f.echeance}`,
      agent: AGENTS.some((a) => a.id === f.agent) ? f.agent : "cerveau",
      categorie: "plus_tard",
      echeance: f.echeance,
      rappel_le: rappel.toISOString(),
      source: "manuel",
    });
  }
  refresh();
  return {};
}
