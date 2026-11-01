"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { aujourdhui } from "@/lib/date";
import { bilanDeLaJournee, demanderAUnAgent } from "@/lib/agents-ia";
import { messageErreurIA } from "@/lib/ia";
import { trouverAgent } from "@/lib/agents";
import {
  lireAlertes,
  lireApprobationsEnAttente,
  lireMessages,
  lirePriorites,
  lireTachesAFaire,
  lireTachesFaitesRecemment,
} from "@/lib/donnees";

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
      .upsert({ cree_par: user.id, jour, rang, texte: propre }, { onConflict: "cree_par,jour,rang" });
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

export type EtatConversation = { erreur?: string; derniereReponse?: string };

// Envoie un message (tapé ou dicté) à un agent et enregistre la réponse.
export async function ecrireAUnAgent(
  agentId: string,
  _etat: EtatConversation,
  form: FormData,
): Promise<EtatConversation> {
  const agent = trouverAgent(agentId);
  if (!agent) return { erreur: "Agent inconnu." };
  const message = String(form.get("message") ?? "").trim().slice(0, 4000);
  if (!message) return {};
  if (!process.env.ANTHROPIC_API_KEY) {
    return { erreur: `${agent.nom} n'est pas encore branché : la clé Anthropic manque.` };
  }

  const { supabase } = await utilisateurConnecte();
  const [historique, contexte] = await Promise.all([lireMessages(agent.id, 20), lireContexte()]);

  let reponse: string;
  try {
    reponse = await demanderAUnAgent(agent.id, historique, message, contexte);
  } catch (e) {
    return { erreur: messageErreurIA(e, agent.nom) };
  }

  // Heures distinctes pour garder l'ordre question → réponse.
  const maintenant = Date.now();
  await supabase.from("messages_agents").insert([
    { agent: agent.id, role: "user", contenu: message, cree_le: new Date(maintenant).toISOString() },
    {
      agent: agent.id,
      role: "assistant",
      contenu: reponse,
      cree_le: new Date(maintenant + 1).toISOString(),
    },
  ]);
  refresh();
  return { derniereReponse: reponse };
}

async function lireContexte() {
  const [priorites, approbations, alertes, taches] = await Promise.all([
    lirePriorites(),
    lireApprobationsEnAttente(),
    lireAlertes(),
    lireTachesAFaire(),
  ]);
  return { priorites, approbations, alertes, taches };
}

// Bilan de fin de journée généré par le Cerveau (sur demande).
export async function genererBilan(): Promise<{ texte?: string; erreur?: string }> {
  await utilisateurConnecte();
  const [contexte, faites] = await Promise.all([lireContexte(), lireTachesFaitesRecemment()]);
  const debutJour = new Date(`${aujourdhui()}T00:00:00-05:00`).getTime();
  const aujourdhuiFaites = faites.filter((t) => t.fait_le && new Date(t.fait_le).getTime() >= debutJour);
  try {
    return { texte: await bilanDeLaJournee(aujourdhuiFaites, contexte) };
  } catch (e) {
    return { erreur: messageErreurIA(e) };
  }
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
