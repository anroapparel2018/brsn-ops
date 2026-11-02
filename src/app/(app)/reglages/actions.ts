"use server";

import { createClientCompagnie as createClient } from "@/lib/compagnie";
import { envoyerPush, pushDisponible } from "@/lib/push";

async function connecte() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  return supabase;
}

export async function enregistrerAbonnement(abonnement: { endpoint: string; keys: Record<string, string> }) {
  const supabase = await connecte();
  if (!abonnement?.endpoint) return { erreur: "Abonnement invalide." };
  const { error } = await supabase
    .from("push_abonnements")
    .upsert({ endpoint: abonnement.endpoint, abonnement }, { onConflict: "endpoint" });
  return error ? { erreur: "L'abonnement n'a pas pu être enregistré." } : {};
}

export async function envoyerTest() {
  const supabase = await connecte();
  if (!pushDisponible()) {
    return { erreur: "Les clés de notification ne sont pas encore dans Vercel (voir le rapport du matin)." };
  }
  const { data } = await supabase.from("push_abonnements").select("endpoint, abonnement");
  if (!data?.length) return { erreur: "Aucun appareil abonné. Touche d'abord « Activer »." };
  const { envoyes, expires } = await envoyerPush(data, {
    titre: "BRSN OPS",
    texte: "Les notifications fonctionnent ✅",
    url: "/a-faire",
  });
  if (expires.length) await supabase.from("push_abonnements").delete().in("endpoint", expires);
  return envoyes ? {} : { erreur: "La notification n'a pas pu être envoyée." };
}
