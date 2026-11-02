import "server-only";
import { createClientCompagnie as createClient } from "@/lib/compagnie";
import { aujourdhui } from "@/lib/date";
import type { AgentId } from "@/lib/agents";
import { COLONNES_TACHE, type Tache } from "@/lib/taches";

export async function lireTachesAFaire(): Promise<Tache[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("taches")
    .select(COLONNES_TACHE)
    .eq("statut", "a_faire")
    .order("cree_le");
  return (data ?? []) as Tache[];
}

export async function lireTachesFaitesRecemment(): Promise<Tache[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("taches")
    .select(COLONNES_TACHE)
    .eq("statut", "fait")
    .gte("fait_le", new Date(Date.now() - 2 * 86_400_000).toISOString())
    .order("fait_le", { ascending: false })
    .limit(20);
  return (data ?? []) as Tache[];
}

export async function lireVentesAnnee(): Promise<{ montant: number; maj: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("reglages").select("valeur").eq("cle", "ventes_annee").maybeSingle();
  return (data?.valeur as { montant: number; maj: string }) ?? null;
}

// Coût de l'API Claude depuis le début du mois (heure du Québec).
export async function lireCoutDuMois() {
  const supabase = await createClient();
  const debut = `${aujourdhui().slice(0, 7)}-01T00:00:00-05:00`;
  const { data } = await supabase.from("usage_ia").select("cout_usd, jetons_entree, jetons_sortie").gte("cree_le", debut);
  return (data ?? []).reduce(
    (t, r) => ({
      cout: t.cout + Number(r.cout_usd),
      jetons: t.jetons + r.jetons_entree + r.jetons_sortie,
      appels: t.appels + 1,
    }),
    { cout: 0, jetons: 0, appels: 0 },
  );
}

// Rappels arrivés à échéance et pas encore vus.
export async function lireRappelsDus(): Promise<Tache[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("taches")
    .select(COLONNES_TACHE)
    .eq("statut", "a_faire")
    .eq("rappel_vu", false)
    .lte("rappel_le", new Date().toISOString())
    .order("rappel_le");
  return (data ?? []) as Tache[];
}

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

export type Evenement = {
  google_id: string;
  debut: string;
  fin: string;
  journee_entiere: boolean;
  titre: string;
  lieu: string | null;
  meet: string | null;
  description: string | null;
  invites: { nom: string; reponse?: string }[];
  lien_google: string | null;
  categorie_auto: string;
  categorie: string | null;
};

export type DemandeEvenement = {
  id: string;
  titre: string;
  debut: string;
  fin: string;
  journee_entiere: boolean;
  lieu: string | null;
  invites: string[];
  meet: boolean;
  categorie: string;
  description: string | null;
  source: "manuel" | "cerveau";
  erreur: string | null;
};

// Demandes d'événements en attente de mon approbation.
export async function lireDemandesAgenda(): Promise<DemandeEvenement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agenda_demandes")
    .select("id, titre, debut, fin, journee_entiere, lieu, invites, meet, categorie, description, source, erreur")
    .eq("statut", "en_attente")
    .order("debut");
  return (data ?? []) as DemandeEvenement[];
}

// Mon agenda (copie locale de Google, lecture seule) entre deux dates ISO.
export async function lireAgenda(debut: string, fin: string) {
  const supabase = await createClient();
  const [{ data: compte }, { data: evenements }] = await Promise.all([
    supabase.from("google_comptes").select("derniere_synchro, peut_ecrire").maybeSingle(),
    supabase
      .from("evenements")
      .select("google_id, debut, fin, journee_entiere, titre, lieu, meet, description, invites, lien_google, categorie_auto, categorie")
      .lt("debut", fin)
      .gt("fin", debut)
      .order("debut"),
  ]);
  return {
    connecte: !!compte,
    peutEcrire: !!compte?.peut_ecrire,
    derniereSynchro: (compte?.derniere_synchro as string | null) ?? null,
    evenements: (evenements ?? []) as Evenement[],
  };
}

export async function lireFiches(types: string[]) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fiches")
    .select("id, type, nom, sous_titre, details, echeance, donnees")
    .in("type", types)
    .order("nom");
  return data ?? [];
}

const COLONNES_APPROBATION = "id, compagnie_id, agent, titre, details, statut, commentaire, photo, cree_le, decide_le";

export async function lireApprobations(agent?: AgentId) {
  const supabase = await createClient();
  let attente = supabase.from("approbations").select(COLONNES_APPROBATION).eq("statut", "en_attente");
  let faites = supabase.from("approbations").select(COLONNES_APPROBATION).neq("statut", "en_attente");
  if (agent) {
    attente = attente.eq("agent", agent);
    faites = faites.eq("agent", agent);
  }
  const [a, f] = await Promise.all([
    attente.order("cree_le"),
    faites.order("decide_le", { ascending: false }).limit(30),
  ]);
  return { enAttente: a.data ?? [], historique: f.data ?? [] };
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

export type MessageAgent = { id: string; role: "user" | "assistant"; contenu: string };

// Les derniers messages échangés avec un agent, du plus ancien au plus récent.
export async function lireMessages(agent: AgentId, nombre = 20): Promise<MessageAgent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages_agents")
    .select("id, role, contenu")
    .eq("agent", agent)
    .order("cree_le", { ascending: false })
    .limit(nombre);
  return ((data ?? []) as MessageAgent[]).reverse();
}
