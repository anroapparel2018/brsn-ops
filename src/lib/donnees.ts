import "server-only";
import { createClient } from "@/lib/supabase/server";
import { aujourdhui } from "@/lib/date";
import type { AgentId } from "@/lib/agents";

// Lectures pour l'Accueil. La sécurité (RLS) de Supabase limite déjà ce que chacun voit.

export type Priorite = { id: string; rang: number; texte: string; faite: boolean };

export async function lirePriorites(): Promise<Priorite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("priorites")
    .select("id, rang, texte, faite")
    .eq("jour", aujourdhui())
    .order("rang");
  return data ?? [];
}

export type ApprobationsEnAttente = {
  total: number;
  parAgent: Partial<Record<AgentId, number>>;
  anciennes: number; // en attente depuis plus de 48 h
};

export async function lireApprobationsEnAttente(): Promise<ApprobationsEnAttente> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("approbations")
    .select("agent, cree_le")
    .eq("statut", "en_attente");

  const limite = Date.now() - 48 * 60 * 60 * 1000;
  const resultat: ApprobationsEnAttente = { total: 0, parAgent: {}, anciennes: 0 };
  for (const a of data ?? []) {
    const agent = a.agent as AgentId;
    resultat.total++;
    resultat.parAgent[agent] = (resultat.parAgent[agent] ?? 0) + 1;
    if (new Date(a.cree_le).getTime() < limite) resultat.anciennes++;
  }
  return resultat;
}

export type Alerte = {
  id: string;
  agent: AgentId;
  titre: string;
  details: string | null;
  niveau: "info" | "important" | "urgent";
  cree_le: string;
};

export async function lireAlertes(): Promise<Alerte[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("alertes")
    .select("id, agent, titre, details, niveau, cree_le")
    .is("vue_le", null)
    .order("cree_le", { ascending: false })
    .limit(20);
  return (data ?? []) as Alerte[];
}

export type MessageCerveau = { id: string; role: "user" | "assistant"; contenu: string };

// Les derniers messages, du plus ancien au plus récent.
export async function lireMessagesCerveau(nombre = 20): Promise<MessageCerveau[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages_cerveau")
    .select("id, role, contenu")
    .order("cree_le", { ascending: false })
    .limit(nombre);
  return ((data ?? []) as MessageCerveau[]).reverse();
}
