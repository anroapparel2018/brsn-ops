"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Enregistre la décision de Julien sur une approbation (avec commentaire et photo facultatifs).
// Rien n'est envoyé ailleurs : l'agent concerné lira la décision dans l'app.
export async function decider(
  id: string,
  statut: "approuve" | "a_changer",
  commentaire: string,
  photo: string | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  if (statut === "a_changer" && !commentaire.trim() && !photo) {
    return { erreur: "Dis ce qu'il faut changer (commentaire ou photo)." };
  }

  const { error } = await supabase
    .from("approbations")
    .update({
      statut,
      commentaire: commentaire.trim() || null,
      photo,
      decide_le: new Date().toISOString(),
      decide_par: user.id,
    })
    .eq("id", id)
    .eq("statut", "en_attente");
  if (error) return { erreur: "La décision n'a pas pu être enregistrée." };
  refresh();
  return {};
}
