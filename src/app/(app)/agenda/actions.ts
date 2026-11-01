"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { synchroniserMonAgenda } from "@/lib/agenda-synchro";
import { CATEGORIES_AGENDA } from "@/lib/categories-agenda";

// À l'ouverture de l'app : synchro si la dernière date de plus de 5 minutes.
export async function synchroniserSiBesoin() {
  const r = await synchroniserMonAgenda();
  if (r.etat === "synchronise") refresh();
  return r.etat;
}

export async function synchroniserMaintenant() {
  const r = await synchroniserMonAgenda({ force: true });
  refresh();
  return r.etat;
}

// Corriger la catégorie (couleur) d'un événement d'un toucher. Gardé dans l'app seulement.
export async function changerCategorie(googleId: string, categorie: string) {
  if (!CATEGORIES_AGENDA.some((c) => c.id === categorie)) return;
  const supabase = await createClient();
  await supabase.from("evenements").update({ categorie }).eq("google_id", googleId);
  refresh();
}

// Déconnecter l'agenda : retire mes jetons et ma copie locale (rien n'est touché dans Google).
export async function deconnecterGoogle() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("evenements").delete().eq("user_id", user.id);
  await supabase.from("google_comptes").delete().eq("user_id", user.id);
  refresh();
}
