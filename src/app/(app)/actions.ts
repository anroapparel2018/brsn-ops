"use server";

import { refresh } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { aujourdhui } from "@/lib/date";
import { demanderAUnAgent } from "@/lib/agents-ia";
import { trouverAgent } from "@/lib/agents";
import {
  lireAlertes,
  lireApprobationsEnAttente,
  lireMessages,
  lirePriorites,
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
  const [historique, priorites, approbations, alertes] = await Promise.all([
    lireMessages(agent.id, 20),
    lirePriorites(),
    lireApprobationsEnAttente(),
    lireAlertes(),
  ]);

  let reponse: string;
  try {
    reponse = await demanderAUnAgent(agent.id, historique, message, {
      priorites,
      approbations,
      alertes,
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { erreur: "La clé Anthropic est refusée. Vérifie-la dans .env.local." };
    }
    if (e instanceof Anthropic.RateLimitError) {
      return { erreur: `${agent.nom} est très occupé. Réessaie dans une minute.` };
    }
    console.error(`${agent.nom} :`, e);
    return { erreur: `${agent.nom} n'a pas pu répondre. Réessaie dans un moment.` };
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
